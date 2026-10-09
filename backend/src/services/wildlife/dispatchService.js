const mongoose = require('mongoose');
const DispatchOrder = require('../../models/DispatchOrder');
const FieldResponseUnit = require('../../models/FieldResponseUnit');
const WildlifeAlert = require('../../models/WildlifeAlert');
const { haversineKm, roundKm } = require('./geo');
const { assertAlertTransition, assertDispatchTransition } = require('./stateMachine');
const { writeAudit } = require('./audit');
const { code, httpError } = require('./ids');
const { emitWildlife } = require('../../socket/wildlifeSocket');
const { loadAlert } = require('./alertService');

const ACTIVE_DISPATCH = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'];
const OUTCOMES = ['ANIMAL_MOVED_AWAY', 'BOUNDARY_INSPECTED', 'AREA_SECURED', 'POACHING_REPORTED', 'FURTHER_ASSISTANCE'];

function withDistance(units, lng, lat) {
  return units
    .map((unit) => {
      const [ulng, ulat] = unit.currentLocation.coordinates;
      const distanceKm = roundKm(haversineKm(lng, lat, ulng, ulat));
      return {
        unit,
        distanceKm,
        distanceLabel: 'straight-line',
        eta: null,
        etaLabel: 'Road routing is not available. Distance is straight-line only.',
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

async function listResponseUnits({ longitude, latitude, radiusKm = 15, availability = 'AVAILABLE', unitType } = {}) {
  const filter = {};
  if (availability) filter.availability = availability;
  if (unitType) filter.unitType = unitType;
  const units = await FieldResponseUnit.find(filter).populate('assignedRanger', 'name email role');
  let ranked = withDistance(units, longitude, latitude);
  if (Number.isFinite(radiusKm)) {
    ranked = ranked.filter((row) => row.distanceKm <= radiusKm);
  }
  return ranked;
}

async function loadDispatch(id) {
  if (!id || typeof id !== 'string') throw httpError('Invalid dispatch id', 400);
  const query = /^DP-/i.test(id)
    ? DispatchOrder.findOne({ dispatchId: id })
    : /^[a-fA-F0-9]{24}$/.test(id)
      ? DispatchOrder.findById(id)
      : null;
  if (!query) throw httpError('Invalid dispatch id', 400);
  const dispatch = await query
    .populate('alert')
    .populate({ path: 'responseUnit', populate: { path: 'assignedRanger', select: 'name email role' } })
    .populate('assignedRanger', 'name email role');
  if (!dispatch) throw httpError('Dispatch not found', 404);
  return dispatch;
}

function assertRangerOwns(dispatch, user) {
  if (user.role === 'ADMIN') return;
  if (user.role !== 'RANGER' || String(dispatch.assignedRanger?._id || dispatch.assignedRanger) !== String(user._id)) {
    throw httpError('You can update only dispatches assigned to you', 403);
  }
}

async function createDispatch({ alertId, unitId, user, idempotencyKey, officerNotes, io }) {
  if (idempotencyKey) {
    const replay = await DispatchOrder.findOne({ idempotencyKey }).populate('alert').populate('responseUnit').populate('assignedRanger', 'name email role');
    if (replay) return { dispatch: replay, replayed: true };
  }

  const alert = await loadAlert(alertId);
  if (alert.activeDispatch || ['RESPONSE_DISPATCHED', 'IN_PROGRESS'].includes(alert.status)) {
    throw httpError('This alert already has an active dispatch', 409);
  }
  if (!['NEW', 'ACKNOWLEDGED'].includes(alert.status)) {
    throw httpError(`Cannot dispatch an alert in status ${alert.status}`, 409);
  }

  const unit = await FieldResponseUnit.findOne({ unitId }).populate('assignedRanger', 'name email role');
  if (!unit) throw httpError('Field response unit not found', 404);
  if (unit.availability !== 'AVAILABLE') throw httpError('Selected unit is not available', 400);
  if (alert.category === 'CAMERA_TRAP_POACHING' && unit.unitType !== 'ANTI_POACHING') {
    throw httpError('Camera-trap poaching alerts require an anti-poaching unit', 400);
  }

  const [tlng, tlat] = alert.location.coordinates;
  const [ulng, ulat] = unit.currentLocation.coordinates;
  const distanceKm = roundKm(haversineKm(tlng, tlat, ulng, ulat));
  const previousAlert = alert.status;

  if (alert.status === 'NEW') {
    assertAlertTransition(alert.status, 'ACKNOWLEDGED');
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = user._id;
    alert.acknowledgedAt = new Date();
  }
  assertAlertTransition(alert.status, 'RESPONSE_DISPATCHED');

  const dispatch = await DispatchOrder.create({
    dispatchId: code('DP'),
    alert: alert._id,
    responseUnit: unit._id,
    assignedRanger: unit.assignedRanger._id || unit.assignedRanger,
    priority: alert.severity,
    targetLocation: alert.location,
    directives: {
      targetLocationText: `${tlat.toFixed(5)}, ${tlng.toFixed(5)} (${alert.nearestVillage || alert.park || 'protected area'})`,
      responsePriority: alert.severity,
      animalWarning: alert.species ? `${alert.species} ${alert.animalCode || ''}`.trim() : 'No animal identity attached',
      safetyInstructions: 'Approach from the protected-area side. Do not crowd the animal. Confirm radio contact before closing distance.',
      officerNotes: officerNotes || '',
      communicationInstructions: 'Report acknowledgement, arrival, and completion on this dispatch. Use the park channel.',
    },
    status: 'ASSIGNED',
    dispatchedAt: new Date(),
    idempotencyKey: idempotencyKey || undefined,
    distanceKm,
    distanceLabel: 'straight-line',
    history: [{ status: 'ASSIGNED', at: new Date(), note: 'Dispatch transmitted', actor: user._id }],
    simulationFlag: true,
  });

  alert.status = 'RESPONSE_DISPATCHED';
  alert.activeDispatch = dispatch._id;
  await alert.save();

  unit.availability = 'ASSIGNED';
  unit.lastUpdatedAt = new Date();
  await unit.save();

  await writeAudit({
    actorId: user._id,
    entityType: 'DispatchOrder',
    entityId: dispatch.dispatchId,
    action: 'DISPATCH_CREATED',
    previousState: null,
    newState: { status: 'ASSIGNED', unitId: unit.unitId, alertId: alert.alertId },
  });
  await writeAudit({
    actorId: user._id,
    entityType: 'WildlifeAlert',
    entityId: alert.alertId,
    action: 'ALERT_DISPATCHED',
    previousState: { status: previousAlert },
    newState: { status: alert.status, dispatchId: dispatch.dispatchId },
  });

  const populated = await loadDispatch(dispatch.dispatchId);
  emitWildlife(io, 'wildlife:dispatch-created', { dispatch: populated }, [populated.assignedRanger?._id || populated.assignedRanger]);
  emitWildlife(io, 'wildlife:alert-updated', { alert });
  return { dispatch: populated, replayed: false };
}

async function transitionDispatch(id, user, toStatus, { note, outcome, photoUrl, io } = {}) {
  const dispatch = await loadDispatch(id);
  assertRangerOwns(dispatch, user);
  const previous = dispatch.status;
  assertDispatchTransition(dispatch.status, toStatus);
  dispatch.status = toStatus;
  const now = new Date();
  if (toStatus === 'ACCEPTED') dispatch.acceptedAt = now;
  if (toStatus === 'IN_PROGRESS') dispatch.startedAt = now;
  if (toStatus === 'COMPLETED') {
    if (!OUTCOMES.includes(outcome)) throw httpError('A valid response outcome is required', 400);
    dispatch.completedAt = now;
    dispatch.outcome = outcome;
    dispatch.responseNotes = note || dispatch.responseNotes;
    if (photoUrl) {
      dispatch.photoUrl = photoUrl;
      dispatch.photoStored = true;
    }
  } else if (note) {
    dispatch.responseNotes = note;
  }
  dispatch.history.push({ status: toStatus, at: now, note: note || '', actor: user._id });
  await dispatch.save();

  const alert = await WildlifeAlert.findById(dispatch.alert._id || dispatch.alert);
  if (alert) {
    const previousAlert = alert.status;
    if (toStatus === 'IN_PROGRESS' && alert.status === 'RESPONSE_DISPATCHED') {
      assertAlertTransition(alert.status, 'IN_PROGRESS');
      alert.status = 'IN_PROGRESS';
      await alert.save();
    }
    if (toStatus === 'COMPLETED' && alert.status !== 'RESOLVED') {
      assertAlertTransition(alert.status, 'RESOLVED');
      alert.status = 'RESOLVED';
      alert.resolvedAt = now;
      alert.resolutionReason = 'RESPONSE_COMPLETED';
      alert.resolutionNotes = note || '';
      await alert.save();
    }
    if (alert.status !== previousAlert) {
      await writeAudit({
        actorId: user._id,
        entityType: 'WildlifeAlert',
        entityId: alert.alertId,
        action: 'ALERT_STATUS_SYNCED',
        previousState: { status: previousAlert },
        newState: { status: alert.status },
        metadata: { dispatchId: dispatch.dispatchId },
      });
      emitWildlife(io, 'wildlife:alert-updated', { alert });
    }
  }

  if (toStatus === 'COMPLETED' || toStatus === 'CANCELLED') {
    await FieldResponseUnit.findByIdAndUpdate(dispatch.responseUnit._id || dispatch.responseUnit, {
      availability: 'AVAILABLE',
      lastUpdatedAt: now,
    });
  }

  await writeAudit({
    actorId: user._id,
    entityType: 'DispatchOrder',
    entityId: dispatch.dispatchId,
    action: `DISPATCH_${toStatus}`,
    previousState: { status: previous },
    newState: { status: toStatus, outcome: dispatch.outcome || null },
    metadata: { note: note || '' },
  });

  const populated = await loadDispatch(dispatch.dispatchId);
  emitWildlife(io, 'wildlife:dispatch-updated', { dispatch: populated }, [populated.assignedRanger?._id || populated.assignedRanger]);
  return populated;
}

async function addProgress(id, user, { note, io }) {
  const dispatch = await loadDispatch(id);
  assertRangerOwns(dispatch, user);
  if (!['ACCEPTED', 'IN_PROGRESS'].includes(dispatch.status)) {
    throw httpError(`Cannot add progress while dispatch is ${dispatch.status}`, 409);
  }
  dispatch.responseNotes = note || dispatch.responseNotes;
  dispatch.history.push({ status: dispatch.status, at: new Date(), note: note || 'Progress note', actor: user._id });
  await dispatch.save();
  await writeAudit({
    actorId: user._id,
    entityType: 'DispatchOrder',
    entityId: dispatch.dispatchId,
    action: 'DISPATCH_PROGRESS',
    previousState: { status: dispatch.status },
    newState: { status: dispatch.status },
    metadata: { note: note || '' },
  });
  const populated = await loadDispatch(dispatch.dispatchId);
  emitWildlife(io, 'wildlife:dispatch-updated', { dispatch: populated }, [user._id]);
  return populated;
}

function assertObjectId(id, label) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw httpError(`Invalid ${label}`, 400);
}

module.exports = {
  listResponseUnits,
  loadDispatch,
  createDispatch,
  transitionDispatch,
  addProgress,
  assertObjectId,
  ACTIVE_DISPATCH,
  OUTCOMES,
};

const WildlifeAnimal = require('../../models/WildlifeAnimal');
const TrackingSensor = require('../../models/TrackingSensor');
const ProtectedZone = require('../../models/ProtectedZone');
const SensorTelemetry = require('../../models/SensorTelemetry');
const WildlifeAlert = require('../../models/WildlifeAlert');
const { ACTIVE_ALERT_STATUSES } = require('../../models/WildlifeAlert');
const { haversineKm, pointInPolygon, roundKm } = require('./geo');
const { assertAlertTransition } = require('./stateMachine');
const { writeAudit } = require('./audit');
const { code, httpError } = require('./ids');
const { emitWildlife } = require('../../socket/wildlifeSocket');

const ACTIVE = ACTIVE_ALERT_STATUSES;

function coordsOf(point) {
  return point?.coordinates || null;
}

async function nearestVillage(lng, lat) {
  const villages = await ProtectedZone.find({ zoneType: 'VILLAGE' });
  let best = null;
  for (const village of villages) {
    const point = coordsOf(village.villageLocation);
    if (!point) continue;
    const km = haversineKm(lng, lat, point[0], point[1]);
    if (!best || km < best.km) {
      best = { km, name: village.villageName || village.name };
    }
  }
  return best
    ? { distanceToVillageKm: roundKm(best.km), nearestVillage: best.name }
    : { distanceToVillageKm: null, nearestVillage: '' };
}

async function findHighRiskZone(lng, lat, park) {
  const filter = { zoneType: 'HIGH_RISK' };
  if (park) filter.park = park;
  const zones = await ProtectedZone.find(filter);
  return zones.find((zone) => pointInPolygon(lng, lat, zone.geometry)) || null;
}

async function openOrUpdateAlert({
  dedupeKey,
  category,
  severity,
  animal,
  sensor,
  zone,
  lng,
  lat,
  speed,
  batteryLevel,
  detectedAt,
  threatClassification,
  recommendedAction,
  evidence,
  actorId,
  io,
}) {
  const existing = await WildlifeAlert.findOne({ dedupeKey, status: { $in: ACTIVE } });
  const village = await nearestVillage(lng, lat);
  const location = { type: 'Point', coordinates: [lng, lat] };

  if (existing) {
    const previous = existing.status;
    existing.location = location;
    existing.distanceToVillageKm = village.distanceToVillageKm;
    existing.nearestVillage = village.nearestVillage;
    existing.movementSpeed = speed ?? existing.movementSpeed;
    existing.batteryLevel = batteryLevel ?? existing.batteryLevel;
    await existing.save();
    await writeAudit({
      actorId,
      entityType: 'WildlifeAlert',
      entityId: existing.alertId,
      action: 'TELEMETRY_ATTACHED',
      previousState: { status: previous },
      newState: { status: existing.status, location: existing.location },
      metadata: { dedupeKey, duplicateSuppressed: true },
    });
    emitWildlife(io, 'wildlife:alert-updated', { alert: existing, duplicateSuppressed: true });
    return { alert: existing, created: false };
  }

  const alert = await WildlifeAlert.create({
    alertId: code('WA'),
    category,
    severity,
    animal: animal?._id || null,
    sensor: sensor?._id || null,
    animalCode: animal?.animalId || '',
    sensorCode: sensor?.sensorId || '',
    species: animal?.species || '',
    park: animal?.park || sensor?.park || zone?.park || '',
    zone: zone?._id || null,
    zoneName: zone?.name || '',
    location,
    distanceToVillageKm: village.distanceToVillageKm,
    nearestVillage: village.nearestVillage,
    detectedAt: detectedAt || new Date(),
    status: 'NEW',
    evidence: evidence || { available: false, simulated: true },
    dedupeKey,
    threatClassification,
    recommendedAction,
    sensorReliability: 'SIMULATED',
    movementSpeed: speed || 0,
    batteryLevel,
    simulationFlag: true,
  });

  await writeAudit({
    actorId,
    entityType: 'WildlifeAlert',
    entityId: alert.alertId,
    action: 'ALERT_CREATED',
    previousState: null,
    newState: { status: 'NEW', category, severity },
    metadata: { dedupeKey },
  });
  emitWildlife(io, 'wildlife:alert-created', { alert });
  return { alert, created: true };
}

async function recordTelemetry({
  animalId,
  longitude,
  latitude,
  speed = 0,
  batteryLevel,
  recordedAt,
  simulationFlag = true,
  io,
  actorId = null,
}) {
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    throw httpError('Longitude and latitude are required numbers', 400);
  }
  const animal = await WildlifeAnimal.findOne({ animalId });
  if (!animal) throw httpError(`Animal ${animalId} not found`, 404);

  const sensor = animal.collarId
    ? await TrackingSensor.findOne({ sensorId: animal.collarId })
    : null;
  const when = recordedAt ? new Date(recordedAt) : new Date();
  const point = { type: 'Point', coordinates: [longitude, latitude] };

  const telemetry = await SensorTelemetry.create({
    sensor: sensor?._id,
    sensorCode: sensor?.sensorId || animal.collarId || 'UNKNOWN',
    animal: animal._id,
    animalCode: animal.animalId,
    coordinates: point,
    speed,
    batteryLevel: batteryLevel ?? animal.batteryLevel,
    recordedAt: when,
    simulationFlag,
  });

  animal.lastLocation = point;
  animal.lastSeenAt = when;
  animal.speedKmh = speed;
  animal.movementStatus = speed > 0.4 ? 'MOVING' : 'STATIONARY';
  if (batteryLevel != null) animal.batteryLevel = batteryLevel;
  animal.simulationFlag = simulationFlag;
  await animal.save();

  if (sensor) {
    sensor.location = point;
    sensor.lastHeartbeatAt = when;
    sensor.status = 'ONLINE';
    sensor.maintenanceWarning = '';
    if (batteryLevel != null) sensor.batteryLevel = batteryLevel;
    sensor.signalStrength = sensor.signalStrength || 80;
    await sensor.save();
  }

  emitWildlife(io, 'wildlife:location-updated', {
    animalId: animal.animalId,
    location: point,
    recordedAt: when,
    simulationFlag: true,
    label: 'DEMO/SIMULATED',
  });

  const zone = await findHighRiskZone(longitude, latitude, animal.park);
  let alertResult = null;
  if (zone) {
    alertResult = await openOrUpdateAlert({
      dedupeKey: `HIGH_RISK_BOUNDARY:${animal.animalId}:${zone._id}`,
      category: 'HIGH_RISK_BOUNDARY',
      severity: zone.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      animal,
      sensor,
      zone,
      lng: longitude,
      lat: latitude,
      speed,
      batteryLevel: batteryLevel ?? animal.batteryLevel,
      detectedAt: when,
      threatClassification: `${animal.species} inside high-risk zone ${zone.name}`,
      recommendedAction: 'Acknowledge the alert and dispatch the nearest available field unit.',
      evidence: { available: false, simulated: true, detectionCategory: '' },
      actorId,
      io,
    });
  } else {
    const village = await nearestVillage(longitude, latitude);
    if (village.distanceToVillageKm != null && village.distanceToVillageKm <= 2) {
      alertResult = await openOrUpdateAlert({
        dedupeKey: `WILDLIFE_PROXIMITY:${animal.animalId}`,
        category: 'WILDLIFE_PROXIMITY',
        severity: 'MEDIUM',
        animal,
        sensor,
        zone: null,
        lng: longitude,
        lat: latitude,
        speed,
        batteryLevel: batteryLevel ?? animal.batteryLevel,
        detectedAt: when,
        threatClassification: `${animal.species} within 2 km straight-line of ${village.nearestVillage}`,
        recommendedAction: 'Watch the collar. Dispatch only if the animal enters the high-risk buffer.',
        evidence: { available: false, simulated: true },
        actorId,
        io,
      });
    }
  }

  return { telemetry, animal, alert: alertResult?.alert || null, alertCreated: Boolean(alertResult?.created) };
}

async function createCameraTrapAlert({ sensorId, detectionCategory = 'Suspected human activity', io, actorId = null }) {
  const sensor = await TrackingSensor.findOne({ sensorId });
  if (!sensor) throw httpError(`Sensor ${sensorId} not found`, 404);
  if (sensor.sensorType !== 'CAMERA_TRAP') throw httpError('Sensor is not a camera trap', 400);
  const [lng, lat] = sensor.location?.coordinates || [81.45, 6.4];
  const animal = sensor.animal ? await WildlifeAnimal.findById(sensor.animal) : null;
  const result = await openOrUpdateAlert({
    dedupeKey: `CAMERA_TRAP_POACHING:${sensor.sensorId}`,
    category: 'CAMERA_TRAP_POACHING',
    severity: 'CRITICAL',
    animal,
    sensor,
    zone: null,
    lng,
    lat,
    speed: 0,
    batteryLevel: sensor.batteryLevel,
    detectedAt: new Date(),
    threatClassification: 'Suspected poaching activity at a camera trap',
    recommendedAction: 'Dispatch an authorized anti-poaching field response unit.',
    evidence: {
      imageUrl: '/api/wildlife/demo-assets/camera-trap.svg',
      capturedAt: new Date(),
      cameraId: sensor.sensorId,
      locationLabel: `${lat.toFixed(5)}, ${lng.toFixed(5)} (DEMO/SIMULATED)`,
      detectionCategory,
      simulated: true,
      available: true,
    },
    actorId,
    io,
  });
  return result;
}

async function markStaleSensorsOffline({ timeoutMs = 15 * 60 * 1000, now = new Date(), io, actorId = null } = {}) {
  const cutoff = new Date(now.getTime() - timeoutMs);
  const stale = await TrackingSensor.find({
    status: { $ne: 'OFFLINE' },
    $or: [{ lastHeartbeatAt: { $lt: cutoff } }, { lastHeartbeatAt: null }],
  });
  const alerts = [];
  for (const sensor of stale) {
    if (!sensor.lastHeartbeatAt) continue;
    sensor.status = 'OFFLINE';
    sensor.maintenanceWarning = `No heartbeat since ${sensor.lastHeartbeatAt.toISOString()}. Maintenance check required. DEMO/SIMULATED.`;
    await sensor.save();
    const [lng, lat] = sensor.location?.coordinates || [81.52, 6.37];
    const category = sensor.sensorType === 'GPS_COLLAR' ? 'GPS_SIGNAL_LOST' : 'SENSOR_OFFLINE';
    const result = await openOrUpdateAlert({
      dedupeKey: `${category}:${sensor.sensorId}`,
      category,
      severity: 'MEDIUM',
      animal: sensor.animal ? await WildlifeAnimal.findById(sensor.animal) : null,
      sensor,
      zone: null,
      lng,
      lat,
      speed: 0,
      batteryLevel: sensor.batteryLevel,
      detectedAt: now,
      threatClassification: 'Sensor stopped communicating',
      recommendedAction: 'Inspect the device and schedule maintenance. This is a simulated heartbeat timeout.',
      evidence: { available: false, simulated: true },
      actorId,
      io,
    });
    alerts.push(result.alert);
    emitWildlife(io, 'wildlife:sensor-offline', {
      sensorId: sensor.sensorId,
      status: 'OFFLINE',
      maintenanceWarning: sensor.maintenanceWarning,
      label: 'DEMO/SIMULATED',
    });
  }
  return alerts;
}

async function loadAlert(id) {
  if (!id || typeof id !== 'string') throw httpError('Invalid alert id', 400);
  if (/^WA-/i.test(id)) {
    const alert = await WildlifeAlert.findOne({ alertId: id })
      .populate('animal')
      .populate('sensor')
      .populate('acknowledgedBy', 'name email role')
      .populate('activeDispatch');
    if (!alert) throw httpError('Alert not found', 404);
    return alert;
  }
  if (!/^[a-fA-F0-9]{24}$/.test(id)) throw httpError('Invalid alert id', 400);
  const alert = await WildlifeAlert.findById(id)
    .populate('animal')
    .populate('sensor')
    .populate('acknowledgedBy', 'name email role')
    .populate('activeDispatch');
  if (!alert) throw httpError('Alert not found', 404);
  return alert;
}

async function acknowledgeAlert(id, user, io) {
  const alert = await loadAlert(id);
  const previous = alert.status;
  assertAlertTransition(alert.status, 'ACKNOWLEDGED');
  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedBy = user._id;
  alert.acknowledgedAt = new Date();
  await alert.save();
  await writeAudit({
    actorId: user._id,
    entityType: 'WildlifeAlert',
    entityId: alert.alertId,
    action: 'ALERT_ACKNOWLEDGED',
    previousState: { status: previous },
    newState: { status: alert.status },
  });
  emitWildlife(io, 'wildlife:alert-updated', { alert });
  return alert;
}

async function resolveAlert(id, user, { reason, notes } = {}, io) {
  const allowed = ['ANIMAL_RETREATED', 'AREA_SECURED', 'FALSE_ALARM', 'MAINTENANCE_COMPLETE', 'RESPONSE_COMPLETED', 'OTHER'];
  if (!allowed.includes(reason)) throw httpError('A valid resolution reason is required', 400);
  const alert = await loadAlert(id);
  if (reason === 'ANIMAL_RETREATED' && alert.activeDispatch) {
    throw httpError('Animal Retreated is only available before a response is dispatched', 409);
  }
  const previous = alert.status;
  assertAlertTransition(alert.status, 'RESOLVED', reason);
  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date();
  alert.resolutionReason = reason;
  alert.resolutionNotes = notes || '';
  await alert.save();
  await writeAudit({
    actorId: user._id,
    entityType: 'WildlifeAlert',
    entityId: alert.alertId,
    action: 'ALERT_RESOLVED',
    previousState: { status: previous },
    newState: { status: 'RESOLVED', resolutionReason: reason },
  });
  emitWildlife(io, 'wildlife:alert-updated', { alert });
  return alert;
}

function asString(value) {
  return typeof value === 'string' ? value : undefined;
}

function listFilter(query) {
  const filter = {};
  const status = asString(query.status);
  const severity = asString(query.severity);
  const category = asString(query.category);
  const park = asString(query.park);
  const species = asString(query.species);
  const from = asString(query.from);
  const to = asString(query.to);
  const q = asString(query.q);
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;
  if (park) filter.park = park;
  if (species) filter.species = species;
  if (from || to) {
    filter.detectedAt = {};
    if (from) filter.detectedAt.$gte = new Date(from);
    if (to) filter.detectedAt.$lte = new Date(to);
  }
  if (q) {
    const safe = q.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(safe, 'i');
    filter.$or = [{ alertId: pattern }, { animalCode: pattern }, { sensorCode: pattern }, { species: pattern }];
  }
  return filter;
}

module.exports = {
  recordTelemetry,
  createCameraTrapAlert,
  markStaleSensorsOffline,
  loadAlert,
  acknowledgeAlert,
  resolveAlert,
  listFilter,
  nearestVillage,
  ACTIVE,
};

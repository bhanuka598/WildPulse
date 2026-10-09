const WildlifeAnimal = require('../models/WildlifeAnimal');
const TrackingSensor = require('../models/TrackingSensor');
const ProtectedZone = require('../models/ProtectedZone');
const SensorTelemetry = require('../models/SensorTelemetry');
const WildlifeAlert = require('../models/WildlifeAlert');
const DispatchOrder = require('../models/DispatchOrder');
const WildlifeAuditLog = require('../models/WildlifeAuditLog');
const User = require('../models/User');
const { ACTIVE_ALERT_STATUSES } = require('../models/WildlifeAlert');
const {
  recordTelemetry,
  loadAlert,
  acknowledgeAlert,
  resolveAlert,
  listFilter,
} = require('../services/wildlife/alertService');
const {
  listResponseUnits,
  loadDispatch,
  createDispatch,
  transitionDispatch,
  addProgress,
} = require('../services/wildlife/dispatchService');
const { seedWildlifeData, runScenario, tickPlayback, setPaused, getSimulationLog } = require('../services/wildlife/simulation');

const CAMERA_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#1c1917"/>
  <rect x="24" y="24" width="912" height="492" fill="none" stroke="#f59e0b" stroke-width="4"/>
  <text x="480" y="200" text-anchor="middle" fill="#f8fafc" font-family="Arial, sans-serif" font-size="42" font-weight="700">DEMO / SIMULATED</text>
  <text x="480" y="260" text-anchor="middle" fill="#fcd34d" font-family="Arial, sans-serif" font-size="28">Camera trap frame — not a real capture</text>
  <text x="480" y="320" text-anchor="middle" fill="#a8a29e" font-family="Arial, sans-serif" font-size="20">CAM-014 · Yala buffer · suspected human activity</text>
  <text x="480" y="380" text-anchor="middle" fill="#a8a29e" font-family="Arial, sans-serif" font-size="18">No wildlife photograph is stored for this demonstration event.</text>
</svg>`;

function send(res, status, body) {
  return res.status(status).json(body);
}

function handle(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err && err.statusCode) {
        return send(res, err.statusCode, { success: false, message: err.message });
      }
      if (err && err.code === 11000) {
        return send(res, 409, { success: false, message: 'Duplicate wildlife record' });
      }
      return next(err);
    });
  };
}

function paging(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function str(value) {
  return typeof value === 'string' ? value : undefined;
}

async function findDemoUsers() {
  const manager = await User.findOne({ role: { $in: ['PARK_MANAGER', 'ADMIN'] }, isActive: true });
  const rangers = await User.find({ role: 'RANGER', isActive: true }).sort('createdAt').limit(2);
  if (!manager || rangers.length < 2) {
    const error = new Error('Seed two rangers and one park manager before running the wildlife demo');
    error.statusCode = 400;
    throw error;
  }
  return { managerId: manager._id, rangerId: rangers[0]._id, farRangerId: rangers[1]._id };
}

exports.demoAsset = (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(CAMERA_SVG);
};

exports.overview = handle(async (req, res) => {
  const active = { status: { $in: ACTIVE_ALERT_STATUSES } };
  const [
    trackedAnimals,
    activeHighRiskAlerts,
    onlineSensors,
    offlineSensors,
    cameraTrapDetections,
    activeDispatches,
    recentTelemetry,
    recentAlerts,
  ] = await Promise.all([
    WildlifeAnimal.countDocuments({ status: 'ACTIVE' }),
    WildlifeAlert.countDocuments({ ...active, severity: { $in: ['HIGH', 'CRITICAL'] } }),
    TrackingSensor.countDocuments({ status: 'ONLINE' }),
    TrackingSensor.countDocuments({ status: 'OFFLINE' }),
    WildlifeAlert.countDocuments({ category: 'CAMERA_TRAP_POACHING' }),
    DispatchOrder.countDocuments({ status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } }),
    SensorTelemetry.find().sort('-recordedAt').limit(8).lean(),
    WildlifeAlert.find(active).sort('-detectedAt').limit(8).lean(),
  ]);
  send(res, 200, {
    success: true,
    label: 'DEMO/SIMULATED',
    overview: {
      trackedAnimals,
      activeHighRiskAlerts,
      onlineSensors,
      offlineSensors,
      cameraTrapDetections,
      activeDispatches,
    },
    recentTelemetry,
    recentAlerts,
  });
});

exports.listAnimals = handle(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = {};
  if (str(req.query.park)) filter.park = str(req.query.park);
  if (str(req.query.species)) filter.species = str(req.query.species);
  if (str(req.query.status)) filter.status = str(req.query.status);
  const [animals, count] = await Promise.all([
    WildlifeAnimal.find(filter).sort('animalId').skip(skip).limit(limit),
    WildlifeAnimal.countDocuments(filter),
  ]);
  send(res, 200, { success: true, count, page, animals, label: 'DEMO/SIMULATED' });
});

exports.getAnimal = handle(async (req, res) => {
  const animal = await WildlifeAnimal.findOne({
    $or: [{ animalId: req.params.id }, /^[a-fA-F0-9]{24}$/.test(req.params.id) ? { _id: req.params.id } : { animalId: '__none__' }],
  });
  if (!animal) return send(res, 404, { success: false, message: 'Animal not found' });
  send(res, 200, { success: true, animal, label: 'DEMO/SIMULATED' });
});

exports.animalTelemetry = handle(async (req, res) => {
  const animal = await WildlifeAnimal.findOne({
    $or: [{ animalId: req.params.id }, /^[a-fA-F0-9]{24}$/.test(req.params.id) ? { _id: req.params.id } : { animalId: '__none__' }],
  });
  if (!animal) return send(res, 404, { success: false, message: 'Animal not found' });
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
  const telemetry = await SensorTelemetry.find({ animal: animal._id }).sort('-recordedAt').limit(limit);
  send(res, 200, { success: true, animalId: animal.animalId, telemetry, label: 'DEMO/SIMULATED' });
});

exports.listSensors = handle(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = {};
  if (str(req.query.status)) filter.status = str(req.query.status);
  if (str(req.query.sensorType)) filter.sensorType = str(req.query.sensorType);
  if (str(req.query.park)) filter.park = str(req.query.park);
  const [sensors, count] = await Promise.all([
    TrackingSensor.find(filter).sort('sensorId').skip(skip).limit(limit).populate('animal', 'animalId name species'),
    TrackingSensor.countDocuments(filter),
  ]);
  send(res, 200, { success: true, count, page, sensors, label: 'DEMO/SIMULATED' });
});

exports.getSensor = handle(async (req, res) => {
  const sensor = await TrackingSensor.findOne({
    $or: [{ sensorId: req.params.id }, /^[a-fA-F0-9]{24}$/.test(req.params.id) ? { _id: req.params.id } : { sensorId: '__none__' }],
  }).populate('animal', 'animalId name species');
  if (!sensor) return send(res, 404, { success: false, message: 'Sensor not found' });
  const telemetry = await SensorTelemetry.find({ sensorCode: sensor.sensorId }).sort('-recordedAt').limit(20);
  send(res, 200, { success: true, sensor, telemetry, label: 'DEMO/SIMULATED' });
});

exports.listZones = handle(async (req, res) => {
  const filter = {};
  if (str(req.query.park)) filter.park = str(req.query.park);
  if (str(req.query.zoneType)) filter.zoneType = str(req.query.zoneType);
  const zones = await ProtectedZone.find(filter).sort('name');
  send(res, 200, { success: true, count: zones.length, zones });
});

exports.listAlerts = handle(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = listFilter(req.query);
  if (req.user.role === 'RANGER') {
    const ids = await DispatchOrder.find({ assignedRanger: req.user._id }).distinct('alert');
    filter._id = { $in: ids };
  }
  const [alerts, count] = await Promise.all([
    WildlifeAlert.find(filter).sort('-detectedAt').skip(skip).limit(limit),
    WildlifeAlert.countDocuments(filter),
  ]);
  send(res, 200, { success: true, count, page, alerts });
});

exports.getAlert = handle(async (req, res) => {
  const alert = await loadAlert(req.params.id);
  if (req.user.role === 'RANGER') {
    const owns = await DispatchOrder.exists({
      alert: alert._id,
      assignedRanger: req.user._id,
    });
    if (!owns) return send(res, 403, { success: false, message: 'This alert is not assigned to you' });
  }
  const telemetry = alert.animal
    ? await SensorTelemetry.find({ animal: alert.animal._id || alert.animal }).sort('-recordedAt').limit(20)
    : [];
  send(res, 200, { success: true, alert, telemetry, label: 'DEMO/SIMULATED' });
});

exports.acknowledge = handle(async (req, res) => {
  const alert = await acknowledgeAlert(req.params.id, req.user, req.app.get('io'));
  send(res, 200, { success: true, alert });
});

exports.resolve = handle(async (req, res) => {
  const alert = await resolveAlert(req.params.id, req.user, req.body || {}, req.app.get('io'));
  send(res, 200, { success: true, alert });
});

exports.alertAudit = handle(async (req, res) => {
  const alert = await loadAlert(req.params.id);
  const audit = await WildlifeAuditLog.find({ entityType: 'WildlifeAlert', entityId: alert.alertId }).sort('-timestamp');
  send(res, 200, { success: true, count: audit.length, audit });
});

exports.responseUnits = handle(async (req, res) => {
  const longitude = Number(req.query.longitude);
  const latitude = Number(req.query.latitude);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return send(res, 400, { success: false, message: 'longitude and latitude are required' });
  }
  const availability = str(req.query.availability) === 'ALL' ? '' : (str(req.query.availability) || 'AVAILABLE');
  const radiusKm = Number(req.query.radiusKm || 15);
  const unitType = typeof req.query.unitType === 'string' ? req.query.unitType : undefined;
  const units = await listResponseUnits({ longitude, latitude, radiusKm, unitType, availability });
  send(res, 200, {
    success: true,
    radiusKm,
    distanceLabel: 'straight-line',
    etaLabel: 'Road routing is not available. Distance is straight-line only.',
    count: units.length,
    units,
  });
});

exports.listDispatches = handle(async (req, res) => {
  const { page, limit, skip } = paging(req);
  const filter = {};
  if (req.user.role === 'RANGER') filter.assignedRanger = req.user._id;
  if (str(req.query.status)) filter.status = str(req.query.status);
  const [dispatches, count] = await Promise.all([
    DispatchOrder.find(filter)
      .sort('-dispatchedAt')
      .skip(skip)
      .limit(limit)
      .populate('alert', 'alertId category severity status species animalCode')
      .populate('responseUnit', 'unitId name unitType')
      .populate('assignedRanger', 'name email role'),
    DispatchOrder.countDocuments(filter),
  ]);
  send(res, 200, { success: true, count, page, dispatches });
});

exports.myDispatches = handle(async (req, res) => {
  const filter = { assignedRanger: req.user._id };
  if (str(req.query.status)) filter.status = str(req.query.status);
  if (req.query.active === 'true') filter.status = { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] };
  const dispatches = await DispatchOrder.find(filter)
    .sort('-dispatchedAt')
    .populate('alert')
    .populate('responseUnit', 'unitId name unitType availability')
    .populate('assignedRanger', 'name email role');
  send(res, 200, { success: true, count: dispatches.length, dispatches });
});

exports.createDispatch = handle(async (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key') || req.body.idempotencyKey;
  const { dispatch, replayed } = await createDispatch({
    alertId: req.body.alertId,
    unitId: req.body.unitId,
    user: req.user,
    idempotencyKey,
    officerNotes: req.body.officerNotes,
    io: req.app.get('io'),
  });
  send(res, replayed ? 200 : 201, { success: true, replayed: Boolean(replayed), dispatch });
});

exports.getDispatch = handle(async (req, res) => {
  const dispatch = await loadDispatch(req.params.id);
  if (req.user.role === 'RANGER' && String(dispatch.assignedRanger?._id || dispatch.assignedRanger) !== String(req.user._id)) {
    return send(res, 403, { success: false, message: 'You can view only dispatches assigned to you' });
  }
  const audit = await WildlifeAuditLog.find({ entityType: 'DispatchOrder', entityId: dispatch.dispatchId }).sort('timestamp');
  send(res, 200, { success: true, dispatch, audit });
});

exports.acceptDispatch = handle(async (req, res) => {
  const dispatch = await transitionDispatch(req.params.id, req.user, 'ACCEPTED', { note: req.body.note, io: req.app.get('io') });
  send(res, 200, { success: true, dispatch });
});

exports.startDispatch = handle(async (req, res) => {
  const dispatch = await transitionDispatch(req.params.id, req.user, 'IN_PROGRESS', { note: req.body.note, io: req.app.get('io') });
  send(res, 200, { success: true, dispatch });
});

exports.progressDispatch = handle(async (req, res) => {
  const dispatch = await addProgress(req.params.id, req.user, { note: req.body.note, io: req.app.get('io') });
  send(res, 200, { success: true, dispatch });
});

exports.completeDispatch = handle(async (req, res) => {
  const dispatch = await transitionDispatch(req.params.id, req.user, 'COMPLETED', {
    note: req.body.note,
    outcome: req.body.outcome,
    photoUrl: req.file?.path || '',
    io: req.app.get('io'),
  });
  send(res, 200, { success: true, dispatch, photoStored: Boolean(req.file?.path) });
});

exports.resetDemo = handle(async (req, res) => {
  const users = await findDemoUsers();
  const result = await seedWildlifeData(users);
  send(res, 200, { success: true, ...result });
});

exports.runScenario = handle(async (req, res) => {
  const result = await runScenario(req.params.code, { io: req.app.get('io'), actorId: req.user._id });
  send(res, 200, { success: true, result });
});

exports.playback = handle(async (req, res) => {
  const action = req.body.action;
  if (action === 'pause') return send(res, 200, { success: true, ...setPaused(true) });
  if (action === 'play') return send(res, 200, { success: true, ...setPaused(false) });
  if (action === 'tick') {
    const result = await tickPlayback({ io: req.app.get('io'), actorId: req.user._id });
    return send(res, 200, { success: true, result });
  }
  return send(res, 400, { success: false, message: 'action must be play, pause, or tick' });
});

exports.demoLog = handle(async (req, res) => {
  send(res, 200, { success: true, log: getSimulationLog(), label: 'DEMO/SIMULATED' });
});

exports.simulateSensor = handle(async (req, res) => {
  const sensor = await TrackingSensor.findOne({ sensorId: req.params.id });
  if (!sensor) return send(res, 404, { success: false, message: 'Sensor not found' });
  if (req.body.status === 'OFFLINE') {
    sensor.lastHeartbeatAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    sensor.status = 'ONLINE';
    await sensor.save();
    const { markStaleSensorsOffline } = require('../services/wildlife/alertService');
    const alerts = await markStaleSensorsOffline({ io: req.app.get('io'), actorId: req.user._id });
    return send(res, 200, { success: true, alerts, label: 'DEMO/SIMULATED' });
  }
  sensor.status = 'ONLINE';
  sensor.lastHeartbeatAt = new Date();
  sensor.maintenanceWarning = '';
  await sensor.save();
  send(res, 200, { success: true, sensor, label: 'DEMO/SIMULATED' });
});

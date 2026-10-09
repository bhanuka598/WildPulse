const WildlifeAnimal = require('../../models/WildlifeAnimal');
const TrackingSensor = require('../../models/TrackingSensor');
const ProtectedZone = require('../../models/ProtectedZone');
const SensorTelemetry = require('../../models/SensorTelemetry');
const WildlifeAlert = require('../../models/WildlifeAlert');
const FieldResponseUnit = require('../../models/FieldResponseUnit');
const DispatchOrder = require('../../models/DispatchOrder');
const WildlifeAuditLog = require('../../models/WildlifeAuditLog');
const { recordTelemetry, createCameraTrapAlert, markStaleSensorsOffline } = require('./alertService');
const { listResponseUnits } = require('./dispatchService');
const { writeAudit } = require('./audit');

const simulationLog = [];

function logEvent(entry) {
  const row = { at: new Date().toISOString(), ...entry, label: 'DEMO/SIMULATED' };
  simulationLog.unshift(row);
  if (simulationLog.length > 100) simulationLog.pop();
  return row;
}

function ring(points) {
  return { type: 'Polygon', coordinates: [points] };
}

const YALA_HIGH_RISK = ring([
  [81.43, 6.385],
  [81.47, 6.385],
  [81.47, 6.415],
  [81.43, 6.415],
  [81.43, 6.385],
]);

const YALA_PARK = ring([
  [81.3, 6.2],
  [81.7, 6.2],
  [81.7, 6.55],
  [81.3, 6.55],
  [81.3, 6.2],
]);

const WILPATTU_PARK = ring([
  [79.85, 8.35],
  [80.15, 8.35],
  [80.15, 8.6],
  [79.85, 8.6],
  [79.85, 8.35],
]);

function point(lng, lat) {
  return { type: 'Point', coordinates: [lng, lat] };
}

async function clearWildlifeData() {
  await Promise.all([
    WildlifeAnimal.deleteMany({}),
    TrackingSensor.deleteMany({}),
    ProtectedZone.deleteMany({}),
    SensorTelemetry.deleteMany({}),
    WildlifeAlert.deleteMany({}),
    FieldResponseUnit.deleteMany({}),
    DispatchOrder.deleteMany({}),
    WildlifeAuditLog.deleteMany({ entityType: { $in: ['WildlifeAlert', 'DispatchOrder', 'TrackingSensor', 'Demo'] } }),
  ]);
}

async function seedWildlifeData({ managerId, rangerId, farRangerId }) {
  if (!managerId || !rangerId || !farRangerId) {
    const error = new Error('Demo seed requires a manager and two ranger user ids');
    error.statusCode = 400;
    throw error;
  }
  await clearWildlifeData();
  const now = new Date();

  await ProtectedZone.create([
    { name: 'Yala National Park', park: 'Yala', zoneType: 'PROTECTED', geometry: YALA_PARK, riskLevel: 'LOW' },
    {
      name: 'Katagamuwa village buffer',
      park: 'Yala',
      zoneType: 'HIGH_RISK',
      geometry: YALA_HIGH_RISK,
      riskLevel: 'HIGH',
    },
    {
      name: 'Katagamuwa',
      park: 'Yala',
      zoneType: 'VILLAGE',
      geometry: ring([
        [81.41, 6.39],
        [81.43, 6.39],
        [81.43, 6.41],
        [81.41, 6.41],
        [81.41, 6.39],
      ]),
      riskLevel: 'HIGH',
      villageName: 'Katagamuwa',
      villageLocation: point(81.42, 6.4),
    },
    {
      name: 'Palatupana',
      park: 'Yala',
      zoneType: 'VILLAGE',
      geometry: ring([
        [81.38, 6.24],
        [81.4, 6.24],
        [81.4, 6.26],
        [81.38, 6.26],
        [81.38, 6.24],
      ]),
      riskLevel: 'MEDIUM',
      villageName: 'Palatupana',
      villageLocation: point(81.39, 6.25),
    },
    { name: 'Wilpattu National Park', park: 'Wilpattu', zoneType: 'PROTECTED', geometry: WILPATTU_PARK, riskLevel: 'LOW' },
  ]);

  const animals = await WildlifeAnimal.create([
    {
      animalId: 'ELE-001',
      name: 'Raja',
      species: 'Asian Elephant',
      collarId: 'GPS-001',
      park: 'Yala',
      lastLocation: point(81.48, 6.4),
      lastSeenAt: now,
      batteryLevel: 82,
      movementStatus: 'STATIONARY',
      speedKmh: 0,
      simulationFlag: true,
    },
    {
      animalId: 'ELE-002',
      name: 'Kumari',
      species: 'Asian Elephant',
      collarId: 'GPS-002',
      park: 'Yala',
      lastLocation: point(81.5, 6.41),
      lastSeenAt: now,
      batteryLevel: 67,
      movementStatus: 'MOVING',
      speedKmh: 2.4,
      simulationFlag: true,
    },
    {
      animalId: 'LEO-003',
      name: 'Bagha',
      species: 'Sri Lankan Leopard',
      collarId: 'GPS-003',
      park: 'Yala',
      lastLocation: point(81.5, 6.42),
      lastSeenAt: now,
      batteryLevel: 54,
      movementStatus: 'MOVING',
      speedKmh: 3.1,
      simulationFlag: true,
    },
    {
      animalId: 'ELE-008',
      name: 'Sena',
      species: 'Asian Elephant',
      collarId: 'GPS-008',
      park: 'Yala',
      lastLocation: point(81.51, 6.395),
      lastSeenAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      batteryLevel: 41,
      movementStatus: 'UNKNOWN',
      speedKmh: 0,
      simulationFlag: true,
    },
    {
      animalId: 'ELE-010',
      name: 'Wilpa',
      species: 'Asian Elephant',
      collarId: 'GPS-010',
      park: 'Wilpattu',
      lastLocation: point(80.02, 8.48),
      lastSeenAt: now,
      batteryLevel: 76,
      movementStatus: 'STATIONARY',
      speedKmh: 0,
      simulationFlag: true,
    },
  ]);

  const byCode = Object.fromEntries(animals.map((animal) => [animal.animalId, animal]));

  await TrackingSensor.create([
    sensor('GPS-001', 'GPS_COLLAR', byCode['ELE-001'], 81.48, 6.4, 'ONLINE', now, 90),
    sensor('GPS-002', 'GPS_COLLAR', byCode['ELE-002'], 81.5, 6.41, 'ONLINE', now, 74),
    sensor('GPS-003', 'GPS_COLLAR', byCode['LEO-003'], 81.5, 6.42, 'ONLINE', now, 70),
    sensor('GPS-008', 'GPS_COLLAR', byCode['ELE-008'], 81.51, 6.395, 'ONLINE', now, 48),
    sensor('GPS-010', 'GPS_COLLAR', byCode['ELE-010'], 80.02, 8.48, 'ONLINE', now, 80),
    sensor('CAM-014', 'CAMERA_TRAP', null, 81.455, 6.402, 'ONLINE', now, 63),
    sensor('CAM-002', 'CAMERA_TRAP', null, 81.51, 6.4, 'ONLINE', now, 88),
  ]);

  await FieldResponseUnit.create([
    {
      unitId: 'FRU-01',
      name: 'Yala Anti-Poaching Team 1',
      assignedRanger: rangerId,
      unitType: 'ANTI_POACHING',
      availability: 'AVAILABLE',
      currentLocation: point(81.48, 6.39),
      lastUpdatedAt: now,
      park: 'Yala',
      simulationFlag: true,
    },
    {
      unitId: 'FRU-02',
      name: 'Tissamaharama Standby Patrol',
      assignedRanger: farRangerId,
      unitType: 'RANGER_PATROL',
      availability: 'AVAILABLE',
      currentLocation: point(81.29, 6.28),
      lastUpdatedAt: now,
      park: 'Yala',
      simulationFlag: true,
    },
  ]);

  await writeAudit({
    actorId: managerId,
    entityType: 'Demo',
    entityId: 'SEED',
    action: 'DEMO_RESET',
    newState: { animals: animals.length },
    metadata: { label: 'DEMO/SIMULATED' },
  });
  logEvent({ action: 'RESET', message: 'Deterministic Yala and Wilpattu demo data loaded.' });
  return { animals: animals.length, label: 'DEMO/SIMULATED' };
}

function sensor(sensorId, sensorType, animal, lng, lat, status, heartbeat, signal) {
  return {
    sensorId,
    sensorType,
    animal: animal?._id || null,
    animalCode: animal?.animalId || null,
    location: point(lng, lat),
    status,
    batteryLevel: animal?.batteryLevel || 70,
    signalStrength: signal,
    lastHeartbeatAt: heartbeat,
    park: animal?.park || 'Yala',
    maintenanceWarning: '',
    simulationFlag: true,
  };
}

const playback = {
  paused: true,
  index: 0,
  path: [
    { animalId: 'ELE-001', longitude: 81.48, latitude: 6.4, speed: 1.2 },
    { animalId: 'ELE-001', longitude: 81.47, latitude: 6.405, speed: 2.1 },
    { animalId: 'ELE-001', longitude: 81.46, latitude: 6.402, speed: 2.8 },
    { animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 3.2 },
  ],
};

async function runScenario(code, { io, actorId } = {}) {
  const scenario = String(code || '').toUpperCase();
  if (scenario === 'A') {
    const result = await recordTelemetry({
      animalId: 'ELE-001',
      longitude: 81.45,
      latitude: 6.4,
      speed: 3.2,
      batteryLevel: 80,
      simulationFlag: true,
      io,
      actorId,
    });
    logEvent({ action: 'SCENARIO_A', message: 'ELE-001 entered the Katagamuwa high-risk buffer.', alertCreated: result.alertCreated });
    return { scenario, ...result, label: 'DEMO/SIMULATED' };
  }
  if (scenario === 'B') {
    const result = await createCameraTrapAlert({
      sensorId: 'CAM-014',
      detectionCategory: 'Suspected poaching activity',
      io,
      actorId,
    });
    logEvent({ action: 'SCENARIO_B', message: 'CAM-014 simulated a poaching detection.', alertCreated: result.created });
    return { scenario, ...result, label: 'DEMO/SIMULATED' };
  }
  if (scenario === 'C') {
    const staleAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await TrackingSensor.updateOne({ sensorId: 'GPS-008' }, { lastHeartbeatAt: staleAt, status: 'ONLINE' });
    const alerts = await markStaleSensorsOffline({ timeoutMs: 15 * 60 * 1000, io, actorId });
    logEvent({ action: 'SCENARIO_C', message: 'GPS-008 heartbeat timed out.', alerts: alerts.length });
    return { scenario, alerts, label: 'DEMO/SIMULATED' };
  }
  if (scenario === 'D') {
    const result = await recordTelemetry({
      animalId: 'ELE-001',
      longitude: 81.47,
      latitude: 6.405,
      speed: 2.2,
      batteryLevel: 79,
      simulationFlag: true,
      io,
      actorId,
    });
    logEvent({ action: 'SCENARIO_D', message: 'ELE-001 moved back inside the park, outside the high-risk buffer.' });
    return { scenario, ...result, hint: 'Resolve an open boundary alert as ANIMAL_RETREATED only if no dispatch exists.', label: 'DEMO/SIMULATED' };
  }
  if (scenario === 'E') {
    await FieldResponseUnit.updateOne({ unitId: 'FRU-01' }, { availability: 'OFF_DUTY' });
    const target = { longitude: 81.45, latitude: 6.4 };
    const initial = await listResponseUnits({ ...target, radiusKm: 15 });
    const expanded = await listResponseUnits({ ...target, radiusKm: 40 });
    logEvent({
      action: 'SCENARIO_E',
      message: 'Nearby unit set off duty. Initial 15 km search is empty; expanded search includes the next unit.',
      initial: initial.length,
      expanded: expanded.length,
    });
    return { scenario, initial, expanded, radiusKm: 15, expandedRadiusKm: 40, label: 'DEMO/SIMULATED' };
  }
  if (scenario === 'F') {
    const first = await recordTelemetry({
      animalId: 'ELE-001',
      longitude: 81.45,
      latitude: 6.401,
      speed: 1.4,
      batteryLevel: 78,
      simulationFlag: true,
      io,
      actorId,
    });
    const second = await recordTelemetry({
      animalId: 'ELE-001',
      longitude: 81.451,
      latitude: 6.402,
      speed: 1.1,
      batteryLevel: 78,
      simulationFlag: true,
      io,
      actorId,
    });
    logEvent({ action: 'SCENARIO_F', message: 'Repeated collar fixes were attached to the active incident.', firstCreated: first.alertCreated, secondCreated: second.alertCreated });
    return { scenario, first, second, label: 'DEMO/SIMULATED' };
  }
  const error = new Error('Unknown scenario. Use A, B, C, D, E, or F.');
  error.statusCode = 400;
  throw error;
}

async function tickPlayback({ io, actorId } = {}) {
  if (playback.paused) return { paused: true, index: playback.index, label: 'DEMO/SIMULATED' };
  if (playback.index >= playback.path.length) {
    playback.paused = true;
    return { paused: true, done: true, index: playback.index, label: 'DEMO/SIMULATED' };
  }
  const step = playback.path[playback.index];
  playback.index += 1;
  const result = await recordTelemetry({ ...step, batteryLevel: 80, simulationFlag: true, io, actorId });
  logEvent({ action: 'TICK', message: `Playback step ${playback.index}`, animalId: step.animalId });
  if (playback.index >= playback.path.length) playback.paused = true;
  return { paused: playback.paused, index: playback.index, ...result, label: 'DEMO/SIMULATED' };
}

function setPaused(paused) {
  playback.paused = paused;
  if (!paused && playback.index >= playback.path.length) playback.index = 0;
  logEvent({ action: paused ? 'PAUSE' : 'PLAY', message: paused ? 'Simulation paused' : 'Simulation playing' });
  return { paused: playback.paused, index: playback.index };
}

function getSimulationLog() {
  return simulationLog;
}

module.exports = {
  seedWildlifeData,
  clearWildlifeData,
  runScenario,
  tickPlayback,
  setPaused,
  getSimulationLog,
  YALA_HIGH_RISK,
};

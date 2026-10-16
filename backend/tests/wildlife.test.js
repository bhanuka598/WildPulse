const { before, after, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'wildlife-test-secret';
process.env.NODE_ENV = 'test';

const User = require('../src/models/User');
const TrackingSensor = require('../src/models/TrackingSensor');
const WildlifeAlert = require('../src/models/WildlifeAlert');
const DispatchOrder = require('../src/models/DispatchOrder');
const FieldResponseUnit = require('../src/models/FieldResponseUnit');
const WildlifeAuditLog = require('../src/models/WildlifeAuditLog');
const {
  recordTelemetry,
  createCameraTrapAlert,
  markStaleSensorsOffline,
  loadAlert,
  resolveAlert,
} = require('../src/services/wildlife/alertService');
const { seedWildlifeData, runScenario, tickPlayback, setPaused } = require('../src/services/wildlife/simulation');
const { loadDispatch, createDispatch, transitionDispatch, addProgress } = require('../src/services/wildlife/dispatchService');
const wildlifeRoutes = require('../src/routes/wildlifeRoutes');
const { registerWildlifeSocket, emitWildlife } = require('../src/socket/wildlifeSocket');
const { assertAlertTransition, assertDispatchTransition } = require('../src/services/wildlife/stateMachine');
const { pointInRing, pointInPolygon, haversineKm, roundKm } = require('../src/services/wildlife/geo');

let memory;
let server;
let baseUrl;
let manager;
let ranger;
let farRanger;

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);
}

function listen(app) {
  return new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
}

async function request(method, path, { token, body, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: response.status, body: json };
}

describe('wildlife monitoring', () => {
  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());
    manager = await User.create({ name: 'Manager', email: 'manager@test.local', password: 'testpass1', role: 'PARK_MANAGER' });
    ranger = await User.create({ name: 'Ranger Near', email: 'ranger@test.local', password: 'testpass1', role: 'RANGER' });
    farRanger = await User.create({ name: 'Ranger Far', email: 'far@test.local', password: 'testpass1', role: 'RANGER' });
    const app = express();
    app.use(express.json());
    app.use('/api/wildlife', wildlifeRoutes);
    server = await listen(app);
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  beforeEach(async () => {
    await seedWildlifeData({ managerId: manager._id, rangerId: ranger._id, farRangerId: farRanger._id });
  });

  it('creates a high alert when coordinates cross a high-risk boundary', async () => {
    const result = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 3, batteryLevel: 80 });
    assert.equal(result.alertCreated, true);
    assert.equal(result.alert.category, 'HIGH_RISK_BOUNDARY');
    assert.equal(result.alert.severity, 'HIGH');
    assert.equal(result.alert.status, 'NEW');
  });

  it('does not create an alert while the animal is outside the risk zone', async () => {
    const result = await recordTelemetry({ animalId: 'ELE-002', longitude: 81.56, latitude: 6.33, speed: 1, batteryLevel: 70 });
    assert.equal(result.alert, null);
    assert.equal(await WildlifeAlert.countDocuments({ animalCode: 'ELE-002' }), 0);
  });

  it('does not create a second active alert for duplicate telemetry', async () => {
    const first = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const second = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.451, latitude: 6.401, speed: 1, batteryLevel: 79 });
    assert.equal(first.alertCreated, true);
    assert.equal(second.alertCreated, false);
    assert.equal(second.alert.alertId, first.alert.alertId);
    assert.equal(await WildlifeAlert.countDocuments({ animalCode: 'ELE-001', category: 'HIGH_RISK_BOUNDARY' }), 1);
  });

  it('marks a silent collar offline and creates a maintenance warning', async () => {
    await TrackingSensor.updateOne({ sensorId: 'GPS-008' }, { lastHeartbeatAt: new Date(Date.now() - 60 * 60 * 1000), status: 'ONLINE' });
    const alerts = await markStaleSensorsOffline({ timeoutMs: 15 * 60 * 1000 });
    const sensor = await TrackingSensor.findOne({ sensorId: 'GPS-008' });
    assert.equal(sensor.status, 'OFFLINE');
    assert.match(sensor.maintenanceWarning, /Maintenance check required/);
    assert.ok(alerts.some((alert) => alert.sensorCode === 'GPS-008' && alert.category === 'GPS_SIGNAL_LOST'));
  });

  it('rejects an invalid alert id', async () => {
    const response = await request('GET', '/api/wildlife/alerts/not-a-real-id', { token: tokenFor(manager) });
    assert.equal(response.status, 400);
  });

  it('rejects an unauthenticated dispatch request', async () => {
    const response = await request('POST', '/api/wildlife/dispatches', { body: { alertId: 'WA-1', unitId: 'FRU-01' } });
    assert.equal(response.status, 401);
  });

  it('stops a ranger from modifying another ranger dispatch', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const dispatched = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', idempotencyKey: 'own-unit' },
    });
    assert.equal(dispatched.status, 201);
    const stolen = await request('PATCH', `/api/wildlife/dispatches/${dispatched.body.dispatch.dispatchId}/accept`, {
      token: tokenFor(farRanger),
      body: {},
    });
    assert.equal(stolen.status, 403);
  });

  it('rejects an unavailable unit and accepts an available one', async () => {
    await FieldResponseUnit.updateOne({ unitId: 'FRU-02' }, { availability: 'OFF_DUTY' });
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const denied = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-02' },
    });
    assert.equal(denied.status, 400);
    const accepted = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', idempotencyKey: 'available-unit' },
    });
    assert.equal(accepted.status, 201);
    assert.equal(accepted.body.dispatch.status, 'ASSIGNED');
  });

  it('prevents a duplicate dispatch for the same idempotency key', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const payload = { alertId: created.alert.alertId, unitId: 'FRU-01' };
    const headers = { 'Idempotency-Key': 'same-key' };
    const first = await request('POST', '/api/wildlife/dispatches', { token: tokenFor(manager), body: payload, headers });
    const second = await request('POST', '/api/wildlife/dispatches', { token: tokenFor(manager), body: payload, headers });
    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(second.body.replayed, true);
    assert.equal(await DispatchOrder.countDocuments({ alert: created.alert._id }), 1);
  });

  it('resolves an alert as animal retreated before dispatch', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    await request('PATCH', `/api/wildlife/alerts/${created.alert.alertId}/acknowledge`, { token: tokenFor(manager) });
    const resolved = await request('PATCH', `/api/wildlife/alerts/${created.alert.alertId}/resolve`, {
      token: tokenFor(manager),
      body: { reason: 'ANIMAL_RETREATED' },
    });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.alert.status, 'RESOLVED');
    assert.equal(resolved.body.alert.resolutionReason, 'ANIMAL_RETREATED');
    assert.equal(await DispatchOrder.countDocuments({}), 0);
  });

  it('rejects invalid status transitions', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const dispatched = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', idempotencyKey: 'transition' },
    });
    const retreated = await request('PATCH', `/api/wildlife/alerts/${created.alert.alertId}/resolve`, {
      token: tokenFor(manager),
      body: { reason: 'ANIMAL_RETREATED' },
    });
    const skipped = await request('PATCH', `/api/wildlife/dispatches/${dispatched.body.dispatch.dispatchId}/complete`, {
      token: tokenFor(ranger),
      body: { outcome: 'AREA_SECURED', note: 'too early' },
    });
    assert.equal(retreated.status, 409);
    assert.equal(skipped.status, 409);
  });

  it('shows the dispatch only on the assigned ranger mobile API', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', idempotencyKey: 'mobile-list' },
    });
    const mine = await request('GET', '/api/wildlife/my-dispatches', { token: tokenFor(ranger) });
    const other = await request('GET', '/api/wildlife/my-dispatches', { token: tokenFor(farRanger) });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.count, 1);
    assert.equal(other.body.count, 0);
  });

  it('keeps alert and dispatch consistent through ranger completion and writes an audit trail', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    await request('PATCH', `/api/wildlife/alerts/${created.alert.alertId}/acknowledge`, { token: tokenFor(manager) });
    const dispatched = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', officerNotes: 'Approach from the park side', idempotencyKey: 'full-flow' },
    });
    const id = dispatched.body.dispatch.dispatchId;
    const accepted = await request('PATCH', `/api/wildlife/dispatches/${id}/accept`, { token: tokenFor(ranger), body: { note: 'Accepted' } });
    const started = await request('PATCH', `/api/wildlife/dispatches/${id}/start`, { token: tokenFor(ranger), body: { note: 'Moving' } });
    const completed = await request('PATCH', `/api/wildlife/dispatches/${id}/complete`, {
      token: tokenFor(ranger),
      body: { outcome: 'AREA_SECURED', note: 'Boundary quiet' },
    });
    assert.equal(accepted.status, 200);
    assert.equal(started.status, 200);
    assert.equal(completed.status, 200);
    const stored = await DispatchOrder.findOne({ dispatchId: id });
    const alert = await WildlifeAlert.findOne({ alertId: created.alert.alertId });
    assert.equal(stored.status, 'COMPLETED');
    assert.equal(stored.outcome, 'AREA_SECURED');
    assert.equal(stored.responseNotes, 'Boundary quiet');
    assert.equal(alert.status, 'RESOLVED');
    assert.equal(alert.resolutionReason, 'RESPONSE_COMPLETED');
    const actions = (await WildlifeAuditLog.find({}).lean()).map((row) => row.action);
    for (const action of ['ALERT_CREATED', 'ALERT_ACKNOWLEDGED', 'DISPATCH_CREATED', 'DISPATCH_ACCEPTED', 'DISPATCH_IN_PROGRESS', 'DISPATCH_COMPLETED']) {
      assert.ok(actions.includes(action), `missing ${action}`);
    }
  });

  it('covers wildlife catalogs, alert visibility, telemetry, and response-unit filtering', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const overview = await request('GET', '/api/wildlife/overview', { token: tokenFor(manager) });
    const animals = await request('GET', '/api/wildlife/animals?park=Yala&species=Asian%20Elephant&status=ACTIVE&page=1&limit=2', { token: tokenFor(manager) });
    const animal = await request('GET', '/api/wildlife/animals/ELE-001', { token: tokenFor(manager) });
    const telemetry = await request('GET', '/api/wildlife/animals/ELE-001/telemetry?limit=1', { token: tokenFor(manager) });
    const sensors = await request('GET', '/api/wildlife/sensors?status=ONLINE&sensorType=GPS_COLLAR&park=Yala&page=1&limit=2', { token: tokenFor(manager) });
    const sensor = await request('GET', '/api/wildlife/sensors/GPS-001', { token: tokenFor(manager) });
    const zones = await request('GET', '/api/wildlife/zones?park=Yala&zoneType=VILLAGE', { token: tokenFor(manager) });
    const alerts = await request('GET', '/api/wildlife/alerts?severity=HIGH&category=HIGH_RISK_BOUNDARY&park=Yala&species=Asian%20Elephant&q=ELE&from=2020-01-01&to=2099-01-01', { token: tokenFor(manager) });
    const alert = await request('GET', `/api/wildlife/alerts/${created.alert.alertId}`, { token: tokenFor(manager) });
    const audit = await request('GET', `/api/wildlife/alerts/${created.alert.alertId}/audit`, { token: tokenFor(manager) });
    const hiddenAlert = await request('GET', `/api/wildlife/alerts/${created.alert.alertId}`, { token: tokenFor(farRanger) });
    const rangerAlerts = await request('GET', '/api/wildlife/alerts', { token: tokenFor(ranger) });
    const invalidUnits = await request('GET', '/api/wildlife/response-units', { token: tokenFor(manager) });
    const units = await request('GET', '/api/wildlife/response-units?longitude=81.45&latitude=6.4&availability=ALL&radiusKm=100&unitType=ANTI_POACHING', { token: tokenFor(manager) });

    assert.equal(overview.status, 200);
    assert.equal(animals.body.count, 3);
    assert.equal(animal.body.animal.animalId, 'ELE-001');
    assert.equal(telemetry.body.telemetry.length, 1);
    assert.ok(sensors.body.count >= 1);
    assert.equal(sensor.body.sensor.sensorId, 'GPS-001');
    assert.equal(zones.body.count, 2);
    assert.equal(alerts.body.count, 1);
    assert.equal(alert.body.alert.alertId, created.alert.alertId);
    assert.ok(audit.body.count >= 1);
    assert.equal(hiddenAlert.status, 403);
    assert.equal(rangerAlerts.body.count, 0);
    assert.equal(invalidUnits.status, 400);
    assert.equal(units.body.count, 1);
  });

  it('covers dispatch listing, access checks, progress updates, and status filters', async () => {
    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2, batteryLevel: 80 });
    const dispatched = await request('POST', '/api/wildlife/dispatches', {
      token: tokenFor(manager),
      body: { alertId: created.alert.alertId, unitId: 'FRU-01', idempotencyKey: 'coverage-dispatch' },
    });
    const id = dispatched.body.dispatch.dispatchId;
    const managerList = await request('GET', '/api/wildlife/dispatches?status=ASSIGNED&page=1&limit=5', { token: tokenFor(manager) });
    const rangerList = await request('GET', '/api/wildlife/dispatches?status=ASSIGNED', { token: tokenFor(ranger) });
    const ownDispatch = await request('GET', `/api/wildlife/dispatches/${id}`, { token: tokenFor(ranger) });
    const otherDispatch = await request('GET', `/api/wildlife/dispatches/${id}`, { token: tokenFor(farRanger) });
    const invalidDispatch = await request('GET', '/api/wildlife/dispatches/not-valid', { token: tokenFor(manager) });
    const accepted = await request('PATCH', `/api/wildlife/dispatches/${id}/accept`, { token: tokenFor(ranger), body: {} });
    const progress = await request('PATCH', `/api/wildlife/dispatches/${id}/progress`, { token: tokenFor(ranger), body: { note: 'On the way' } });
    const myDispatches = await request('GET', '/api/wildlife/my-dispatches?active=true', { token: tokenFor(ranger) });

    assert.equal(managerList.body.count, 1);
    assert.equal(rangerList.body.count, 1);
    assert.equal(ownDispatch.body.dispatch.dispatchId, id);
    assert.equal(otherDispatch.status, 403);
    assert.equal(invalidDispatch.status, 400);
    assert.equal(accepted.status, 200);
    assert.equal(progress.status, 200);
    assert.equal(progress.body.dispatch.responseNotes, 'On the way');
    assert.equal(myDispatches.body.count, 1);
  });

  it('runs all wildlife demo scenarios and playback controls', async () => {
    for (const code of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const response = await request('POST', `/api/wildlife/demo/scenarios/${code}`, { token: tokenFor(manager), body: {} });
      assert.equal(response.status, 200, `scenario ${code} should run`);
      assert.equal(response.body.result.scenario, code);
    }
    const unknownScenario = await request('POST', '/api/wildlife/demo/scenarios/unknown', { token: tokenFor(manager), body: {} });
    assert.equal(unknownScenario.status, 400);

    const paused = await request('POST', '/api/wildlife/demo/playback', { token: tokenFor(manager), body: { action: 'pause' } });
    const pausedTick = await request('POST', '/api/wildlife/demo/playback', { token: tokenFor(manager), body: { action: 'tick' } });
    const playing = await request('POST', '/api/wildlife/demo/playback', { token: tokenFor(manager), body: { action: 'play' } });
    const ticks = [];
    for (let i = 0; i < 4; i += 1) {
      ticks.push(await request('POST', '/api/wildlife/demo/playback', { token: tokenFor(manager), body: { action: 'tick' } }));
    }
    const invalidAction = await request('POST', '/api/wildlife/demo/playback', { token: tokenFor(manager), body: { action: 'invalid' } });
    const log = await request('GET', '/api/wildlife/demo/log', { token: tokenFor(manager) });

    assert.equal(paused.body.paused, true);
    assert.equal(pausedTick.body.result.paused, true);
    assert.equal(playing.body.paused, false);
    assert.ok(ticks.every((response) => response.status === 200));
    assert.equal(invalidAction.status, 400);
    assert.ok(log.body.log.length > 0);
  });

  it('covers missing and invalid authentication, and distinguishes missing catalog records', async () => {
    const missingAuth = await request('GET', '/api/wildlife/animals');
    const invalidAuth = await request('GET', '/api/wildlife/animals', { token: 'not-a-valid-token' });
    const inactiveOrMissingUser = await request('GET', '/api/wildlife/animals', {
      token: jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET),
    });
    const rangerForbidden = await request('GET', '/api/wildlife/response-units?longitude=81.45&latitude=6.4', { token: tokenFor(ranger) });
    const missingAnimal = await request('GET', '/api/wildlife/animals/NO-SUCH-ANIMAL', { token: tokenFor(manager) });
    const missingAnimalTelemetry = await request('GET', '/api/wildlife/animals/NO-SUCH-ANIMAL/telemetry', { token: tokenFor(manager) });
    const missingSensor = await request('GET', '/api/wildlife/sensors/NO-SUCH-SENSOR', { token: tokenFor(manager) });

    assert.equal(missingAuth.status, 401);
    assert.equal(invalidAuth.status, 401);
    assert.equal(inactiveOrMissingUser.status, 401);
    assert.equal(rangerForbidden.status, 403);
    assert.equal(missingAnimal.status, 404);
    assert.equal(missingAnimalTelemetry.status, 404);
    assert.equal(missingSensor.status, 404);
  });

  it('covers socket authentication, room membership, and targeted event delivery', async () => {
    let authenticate;
    let onConnection;
    const deliveries = [];
    const io = {
      use: (callback) => { authenticate = callback; },
      on: (event, callback) => {
        assert.equal(event, 'connection');
        onConnection = callback;
      },
      to: (room) => ({
        emit: (event, payload) => deliveries.push({ room, event, payload }),
      }),
    };
    registerWildlifeSocket(io);

    const runAuth = (socket) => new Promise((resolve) => authenticate(socket, (error) => resolve(error)));
    const anonymous = { handshake: { auth: {} }, data: {} };
    const invalid = { handshake: { auth: { token: 'invalid' } }, data: {} };
    const managerSocket = { handshake: { auth: { token: tokenFor(manager) } }, data: {}, rooms: [], join(room) { this.rooms.push(room); } };
    const rangerSocket = { handshake: { auth: { token: tokenFor(ranger) } }, data: {}, rooms: [], join(room) { this.rooms.push(room); } };
    const missingUserSocket = {
      handshake: { auth: { token: jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET) } },
      data: {},
    };

    assert.equal(await runAuth(anonymous), undefined);
    assert.equal(await runAuth(invalid), undefined);
    assert.equal(await runAuth(managerSocket), undefined);
    assert.equal(await runAuth(rangerSocket), undefined);
    assert.equal(await runAuth(missingUserSocket), undefined);

    onConnection({ data: {} });
    onConnection(managerSocket);
    onConnection(rangerSocket);
    assert.deepEqual(managerSocket.rooms, ['wildlife:managers', `wildlife:ranger:${manager._id}`]);
    assert.deepEqual(rangerSocket.rooms, [`wildlife:ranger:${ranger._id}`]);

    emitWildlife(null, 'ignored', {});
    emitWildlife(io, 'updated', { id: 1 }, [ranger._id, String(ranger._id), null]);
    assert.deepEqual(deliveries.map(({ room }) => room), ['wildlife:managers', `wildlife:ranger:${ranger._id}`]);
    assert.ok(deliveries.every(({ event, payload }) => event === 'updated' && payload.id === 1));
  });

  it('covers geometry edge cases and rejected alert and dispatch transitions', () => {
    const square = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]];
    assert.equal(pointInRing(1, 1, square), true);
    assert.equal(pointInRing(3, 1, square), false);
    assert.equal(pointInRing(1, 1, []), false);
    assert.equal(pointInPolygon(1, 1, { coordinates: [square, [[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5], [0.5, 0.5]]] }), false);
    assert.equal(pointInPolygon(1, 1, null), false);
    assert.ok(haversineKm(0, 0, 1, 1) > 0);
    assert.equal(roundKm(1.234), 1.23);
    assert.throws(() => assertAlertTransition('RESPONSE_DISPATCHED', 'RESOLVED', 'ANIMAL_RETREATED'), { statusCode: 409 });
    assert.throws(() => assertAlertTransition('NEW', 'IN_PROGRESS'), { statusCode: 409 });
    assert.throws(() => assertDispatchTransition('ASSIGNED', 'COMPLETED'), { statusCode: 409 });
  });

  it('covers telemetry validation, collarless sensors, camera trap errors, alert lookup, and alert resolution guards', async () => {
    await assert.rejects(recordTelemetry({ animalId: 'ELE-001', longitude: '81.45', latitude: 6.4 }), { statusCode: 400 });
    await assert.rejects(recordTelemetry({ animalId: 'MISSING', longitude: 81.45, latitude: 6.4 }), { statusCode: 404 });
    await assert.rejects(createCameraTrapAlert({ sensorId: 'MISSING-CAMERA' }), { statusCode: 404 });
    await assert.rejects(createCameraTrapAlert({ sensorId: 'GPS-001' }), { statusCode: 400 });
    await assert.rejects(loadAlert(''), { statusCode: 400 });
    await assert.rejects(loadAlert('invalid-id'), { statusCode: 400 });
    await assert.rejects(loadAlert(new mongoose.Types.ObjectId().toString()), { statusCode: 404 });
    await assert.rejects(resolveAlert('WA-MISSING', manager, { reason: 'NOT_A_REASON' }), { statusCode: 400 });

    await TrackingSensor.deleteOne({ sensorId: 'GPS-002' });
    const nearVillage = await recordTelemetry({
      animalId: 'ELE-002',
      longitude: 81.42,
      latitude: 6.4,
      speed: 0,
      simulationFlag: false,
    });
    assert.equal(nearVillage.alert.category, 'WILDLIFE_PROXIMITY');
    assert.equal(nearVillage.alertCreated, true);
    assert.equal(nearVillage.telemetry.sensorCode, 'GPS-002');

    await TrackingSensor.updateOne({ sensorId: 'CAM-002' }, { $unset: { location: 1 } });
    const cameraAlert = await createCameraTrapAlert({ sensorId: 'CAM-002' });
    assert.equal(cameraAlert.alert.location.coordinates[0], 81.45);
    assert.equal(cameraAlert.alert.location.coordinates[1], 6.4);

    await TrackingSensor.updateOne({ sensorId: 'CAM-002' }, {
      $set: {
        location: { type: 'Point', coordinates: [81.51, 6.4] },
        lastHeartbeatAt: new Date(Date.now() - 60 * 60 * 1000),
        status: 'ONLINE',
      },
    });
    const staleAlerts = await markStaleSensorsOffline();
    assert.ok(staleAlerts.some((alert) => alert.sensorCode === 'CAM-002' && alert.category === 'SENSOR_OFFLINE'));
  });

  it('covers dispatch service validation and failed lifecycle transitions', async () => {
    await assert.rejects(loadDispatch(), { statusCode: 400 });
    await assert.rejects(loadDispatch('bad-id'), { statusCode: 400 });
    await assert.rejects(loadDispatch(new mongoose.Types.ObjectId().toString()), { statusCode: 404 });
    await assert.rejects(createDispatch({ alertId: 'missing-alert', unitId: 'FRU-01', user: manager }), { statusCode: 400 });

    const created = await recordTelemetry({ animalId: 'ELE-001', longitude: 81.45, latitude: 6.4, speed: 2 });
    await assert.rejects(createDispatch({ alertId: created.alert.alertId, unitId: 'MISSING-UNIT', user: manager }), { statusCode: 404 });

    const camera = await createCameraTrapAlert({ sensorId: 'CAM-014' });
    await assert.rejects(createDispatch({ alertId: camera.alert.alertId, unitId: 'FRU-02', user: manager }), { statusCode: 400 });
    const cameraDispatch = await createDispatch({
      alertId: camera.alert.alertId,
      unitId: 'FRU-01',
      user: manager,
      officerNotes: '',
    });
    assert.equal(cameraDispatch.replayed, false);
    assert.equal(cameraDispatch.dispatch.directives.animalWarning, 'No animal identity attached');
    await assert.rejects(createDispatch({ alertId: camera.alert.alertId, unitId: 'FRU-01', user: manager }), { statusCode: 409 });
    await assert.rejects(createDispatch({ alertId: camera.alert.alertId, unitId: 'FRU-01', user: manager, idempotencyKey: 'coverage-dispatch' }), { statusCode: 409 });

    const dispatchId = cameraDispatch.dispatch.dispatchId;
    const assigned = { _id: ranger._id, role: 'RANGER' };
    await assert.rejects(transitionDispatch(dispatchId, farRanger, 'ACCEPTED'), { statusCode: 403 });
    await assert.rejects(addProgress(dispatchId, assigned, { note: 'too early' }), { statusCode: 409 });
    const accepted = await transitionDispatch(dispatchId, assigned, 'ACCEPTED', {});
    assert.equal(accepted.status, 'ACCEPTED');
    const progress = await addProgress(dispatchId, assigned, {});
    assert.equal(progress.status, 'ACCEPTED');
    await transitionDispatch(dispatchId, assigned, 'IN_PROGRESS', {});
    await assert.rejects(transitionDispatch(dispatchId, assigned, 'COMPLETED', { outcome: 'INVALID' }), { statusCode: 400 });

    const admin = await User.create({ name: 'Admin', email: 'admin@test.local', password: 'testpass1', role: 'ADMIN' });
    const stillAssigned = await loadDispatch(dispatchId);
    assert.equal(stillAssigned.assignedRanger._id.toString(), ranger._id.toString());
    assert.equal((await transitionDispatch(dispatchId, admin, 'COMPLETED', { outcome: 'AREA_SECURED', photoUrl: '/photo.jpg' })).photoStored, true);
  });

  it('covers demo setup, unknown users, completed playback, and reset protection', async () => {
    await assert.rejects(runScenario('Z'), { statusCode: 400 });
    setPaused(false);
    for (let i = 0; i < 4; i += 1) await tickPlayback();
    assert.equal((await tickPlayback()).paused, true);
    assert.equal(setPaused(false).index, 0);

    await User.deleteMany({ role: 'RANGER' });
    const resetWithoutUsers = await request('POST', '/api/wildlife/demo/reset', { token: tokenFor(manager) });
    assert.equal(resetWithoutUsers.status, 400);
  });
});

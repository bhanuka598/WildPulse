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
const { recordTelemetry, markStaleSensorsOffline } = require('../src/services/wildlife/alertService');
const { seedWildlifeData } = require('../src/services/wildlife/simulation');
const wildlifeRoutes = require('../src/routes/wildlifeRoutes');

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
});

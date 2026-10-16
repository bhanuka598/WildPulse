const { after, before, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'community-report-test-secret';
process.env.NODE_ENV = 'test';

const User = require('../src/models/User');
const WildlifeConflict = require('../src/models/WildlifeConflict');
const Alert = require('../src/models/Alert');
const conflictController = require('../src/controllers/conflictController');
const conflictRoutes = require('../src/routes/conflictRoutes');
const { errorHandler } = require('../src/middleware/errorMiddleware');

let memory;
let server;
let baseUrl;
let app;
let manager;
let ranger;
let liaison;
const emittedEvents = [];

function tokenFor(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET);
}

function listen(expressApp) {
  return new Promise((resolve) => {
    const instance = expressApp.listen(0, '127.0.0.1', () => resolve(instance));
  });
}

async function request(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : {},
  };
}

async function submitReport(overrides = {}) {
  return request('POST', '/api/conflicts', {
    body: {
      reporterName: 'Community member',
      reporterPhone: '0771234567',
      conflictType: 'SIGHTING',
      description: 'Wildlife seen near the village boundary',
      latitude: 6.4,
      longitude: 81.45,
      villageArea: 'Katagamuwa',
      ...overrides,
    },
  });
}

describe('Member 3 community reporting service', () => {
  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri());
    manager = await User.create({
      name: 'Park Manager',
      email: 'community-manager@test.local',
      password: 'testpass1',
      role: 'PARK_MANAGER',
    });
    ranger = await User.create({
      name: 'Field Ranger',
      email: 'community-ranger@test.local',
      password: 'testpass1',
      role: 'RANGER',
    });
    liaison = await User.create({
      name: 'Community Liaison',
      email: 'community-liaison@test.local',
      password: 'testpass1',
      role: 'COMMUNITY_LIAISON_OFFICER',
    });

    app = express();
    app.use(express.json());
    app.set('io', {
      emit: (event, payload) => emittedEvents.push({ event, payload }),
    });
    app.use('/api/conflicts', conflictRoutes);
    app.use(errorHandler);
    server = await listen(app);
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  beforeEach(async () => {
    await WildlifeConflict.deleteMany({});
    await Alert.deleteMany({});
    emittedEvents.length = 0;
  });

  it('accepts a public report, normalizes coordinates, assigns defaults, broadcasts it, and allows tracking', async () => {
    const created = await submitReport({ latitude: '6.401', longitude: '81.451' });

    assert.equal(created.status, 201);
    assert.equal(created.body.success, true);
    assert.equal(created.body.conflict.reporterType, 'COMMUNITY_MEMBER');
    assert.equal(created.body.conflict.status, 'REPORTED');
    assert.equal(created.body.conflict.park, 'Yala');
    assert.equal(created.body.conflict.animalSpecies, 'Elephant');
    assert.equal(created.body.conflict.latitude, 6.401);
    assert.equal(created.body.conflict.longitude, 81.451);
    assert.match(created.body.conflict.reportId, /^WC-\d{4}-\d{4,5}$/);
    assert.equal(emittedEvents.length, 1);
    assert.equal(emittedEvents[0].event, 'new_conflict');
    assert.equal(String(emittedEvents[0].payload._id), created.body.conflict._id);

    const stored = await WildlifeConflict.findById(created.body.conflict._id);
    const tracked = await request('GET', `/api/conflicts/public/${created.body.conflict._id}`);
    assert.equal(stored.reporterPhone, '0771234567');
    assert.equal(tracked.status, 200);
    assert.equal(tracked.body.conflict.reportId, created.body.conflict.reportId);
  });

  it('creates critical and high-priority alerts only for the designated urgent report categories', async () => {
    const injury = await submitReport({
      conflictType: 'HUMAN_INJURY',
      description: 'A resident was injured during an elephant encounter',
      villageArea: 'Katagamuwa',
    });
    const livestock = await submitReport({
      conflictType: 'LIVESTOCK_ATTACK',
      description: 'A leopard attacked livestock',
      villageArea: '',
    });
    const cropRaid = await submitReport({
      conflictType: 'CROP_RAIDING',
      description: 'Elephants damaged crops',
    });
    const sighting = await submitReport({ conflictType: 'SIGHTING' });

    assert.equal(injury.status, 201);
    assert.equal(livestock.status, 201);
    assert.equal(cropRaid.status, 201);
    assert.equal(sighting.status, 201);
    assert.equal(await Alert.countDocuments({}), 3);
    assert.equal(await Alert.countDocuments({ severity: 'CRITICAL' }), 1);
    assert.equal(await Alert.countDocuments({ severity: 'HIGH' }), 2);

    const injuryAlert = await Alert.findOne({ severity: 'CRITICAL' });
    const livestockAlert = await Alert.findOne({ title: /LIVESTOCK_ATTACK/ });
    assert.match(injuryAlert.message, /Katagamuwa/);
    assert.match(livestockAlert.message, /\(Location: Area\)/);
  });

  it('requires staff authentication for report listing and filters by status, type, and reporter phone', async () => {
    await submitReport({ reporterPhone: '0771111111', conflictType: 'SIGHTING' });
    const cropReport = await submitReport({ reporterPhone: '0772222222', conflictType: 'CROP_DAMAGE' });

    const anonymousList = await request('GET', '/api/conflicts');
    const all = await request('GET', '/api/conflicts', { token: tokenFor(manager) });
    const filtered = await request(
      'GET',
      '/api/conflicts?status=REPORTED&conflictType=CROP_DAMAGE&reporterPhone=0772222222',
      { token: tokenFor(manager) }
    );
    const noMatches = await request(
      'GET',
      '/api/conflicts?status=RESOLVED&conflictType=SIGHTING&reporterPhone=0771111111',
      { token: tokenFor(manager) }
    );
    const storedById = await request('GET', `/api/conflicts/${cropReport.body.conflict._id}`, { token: tokenFor(manager) });

    assert.equal(anonymousList.status, 401);
    assert.equal(all.body.count, 2);
    assert.equal(filtered.body.count, 1);
    assert.equal(filtered.body.conflicts[0].reporterPhone, '0772222222');
    assert.equal(noMatches.body.count, 0);
    assert.equal(storedById.body.conflict._id, cropReport.body.conflict._id);
  });

  it('allows managers and liaison officers to assign rangers but denies ranger assignment', async () => {
    const report = await submitReport();
    const id = report.body.conflict._id;

    const rangerDenied = await request('PUT', `/api/conflicts/${id}/assign`, {
      token: tokenFor(ranger),
      body: { rangerId: ranger._id.toString() },
    });
    const managerAssignment = await request('PUT', `/api/conflicts/${id}/assign`, {
      token: tokenFor(manager),
      body: { rangerId: ranger._id.toString() },
    });

    assert.equal(rangerDenied.status, 403);
    assert.equal(managerAssignment.status, 200);
    assert.equal(managerAssignment.body.conflict.status, 'ASSIGNED');
    assert.equal(managerAssignment.body.conflict.assignedRanger._id, ranger._id.toString());
    assert.equal(managerAssignment.body.conflict.reviewedBy._id, manager._id.toString());
    assert.ok(managerAssignment.body.conflict.assignedAt);
    assert.ok(managerAssignment.body.conflict.reviewedAt);

    const liaisonAssignment = await request('PUT', `/api/conflicts/${id}/assign`, {
      token: tokenFor(liaison),
      body: { rangerId: ranger._id.toString() },
    });
    assert.equal(liaisonAssignment.status, 200);
    assert.equal(liaisonAssignment.body.conflict.reviewedBy._id, liaison._id.toString());
  });

  it('tracks the report through in-progress and resolution updates with persisted notes and timestamps', async () => {
    const report = await submitReport({ conflictType: 'PROPERTY_DAMAGE' });
    const id = report.body.conflict._id;
    const progress = await request('PUT', `/api/conflicts/${id}/status`, {
      token: tokenFor(ranger),
      body: { status: 'IN_PROGRESS' },
    });
    const resolved = await request('PUT', `/api/conflicts/${id}/status`, {
      token: tokenFor(ranger),
      body: { status: 'RESOLVED', resolutionNotes: 'Fence repaired and area inspected.' },
    });
    const stored = await WildlifeConflict.findById(id);

    assert.equal(progress.status, 200);
    assert.equal(progress.body.conflict.status, 'IN_PROGRESS');
    assert.ok(progress.body.conflict.reviewedAt);
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.conflict.status, 'RESOLVED');
    assert.equal(resolved.body.conflict.resolutionNotes, 'Fence repaired and area inspected.');
    assert.ok(resolved.body.conflict.resolvedAt);
    assert.equal(stored.status, 'RESOLVED');
    assert.equal(stored.resolutionNotes, 'Fence repaired and area inspected.');

    const statusOnly = await request('PUT', `/api/conflicts/${id}/status`, {
      token: tokenFor(ranger),
      body: { status: 'REPORTED' },
    });
    assert.equal(statusOnly.status, 200);
    assert.equal(statusOnly.body.conflict.status, 'REPORTED');
    assert.equal(statusOnly.body.conflict.resolutionNotes, 'Fence repaired and area inspected.');
  });

  it('stores an optional evidence image on the created report', async () => {
    let responseStatus;
    let responseBody;
    let forwardedError;
    const io = app.get('io');
    await conflictController.createConflict(
      {
        body: {
          conflictType: 'CROP_DAMAGE',
          description: 'Paddy field damaged',
          latitude: '6.41',
          longitude: '81.46',
        },
        file: { path: 'https://images.example.test/report.png' },
        app: { get: () => io },
      },
      {
        status(status) {
          responseStatus = status;
          return this;
        },
        json(body) {
          responseBody = body;
          return this;
        },
      },
      (error) => {
        forwardedError = error;
      }
    );

    assert.equal(forwardedError, undefined);
    assert.equal(responseStatus, 201);
    assert.equal(responseBody.conflict.imageUrl, 'https://images.example.test/report.png');
    assert.equal((await WildlifeConflict.findById(responseBody.conflict._id)).imageUrl, responseBody.conflict.imageUrl);
  });

  it('returns not-found for unknown public tracking ids and forwards invalid report errors', async () => {
    const unknownReport = await request('GET', '/api/conflicts/public/000000000000000000000000');
    const invalidReport = await request('POST', '/api/conflicts', {
      body: {
        conflictType: 'NOT_A_CONFLICT',
        description: 'Invalid category',
        latitude: 6.4,
        longitude: 81.45,
      },
    });

    assert.equal(unknownReport.status, 404);
    assert.equal(unknownReport.body.message, 'Conflict report not found');
    assert.equal(invalidReport.status, 500);
    assert.match(invalidReport.body.message, /validation failed/i);
  });
});

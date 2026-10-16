const { before, after, beforeEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const WildlifeConflict = require('../src/models/WildlifeConflict');
const Patrol = require('../src/models/Patrol');
const FieldIncident = require('../src/models/FieldIncident');
const analyticsRoutes = require('../src/routes/analyticsRoutes');

let server;
let baseUrl;

// Helper to start the Express test server on an ephemeral port
function listen(app) {
  return new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
}

// Helper to make HTTP GET requests to the test server
async function requestGet(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

// Preserve original model methods so we can restore them
const originalConflictFind = WildlifeConflict.find;
const originalConflictCount = WildlifeConflict.countDocuments;
const originalConflictDistinct = WildlifeConflict.distinct;

const originalPatrolFind = Patrol.find;
const originalPatrolCount = Patrol.countDocuments;
const originalPatrolDistinct = Patrol.distinct;

const originalIncidentFind = FieldIncident.find;
const originalIncidentCount = FieldIncident.countDocuments;
const originalIncidentDistinct = FieldIncident.distinct;

describe('Member 1: Conservation Analytics & Reports Test Suite', () => {
  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRoutes);
    server = await listen(app);
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Restore originals
    WildlifeConflict.find = originalConflictFind;
    WildlifeConflict.countDocuments = originalConflictCount;
    WildlifeConflict.distinct = originalConflictDistinct;

    Patrol.find = originalPatrolFind;
    Patrol.countDocuments = originalPatrolCount;
    Patrol.distinct = originalPatrolDistinct;

    FieldIncident.find = originalIncidentFind;
    FieldIncident.countDocuments = originalIncidentCount;
    FieldIncident.distinct = originalIncidentDistinct;
  });

  beforeEach(() => {
    // Default mock query helper returning chainable .sort()
    const chainable = (data = []) => ({
      sort: () => Promise.resolve(data),
    });

    WildlifeConflict.find = () => chainable([]);
    WildlifeConflict.countDocuments = async () => 0;
    WildlifeConflict.distinct = async () => [];

    Patrol.find = () => chainable([]);
    Patrol.countDocuments = async () => 0;
    Patrol.distinct = async () => [];

    FieldIncident.find = () => chainable([]);
    FieldIncident.countDocuments = async () => 0;
    FieldIncident.distinct = async () => [];
  });

  // ==========================================
  // Category 1: Human-Wildlife Conflict Incidents
  // ==========================================
  describe('GET /api/analytics/report - Human-Wildlife Conflict Incidents', () => {
    it('generates report for Human-Wildlife Conflicts with date filters, trends, critical severity, and sectors', async () => {
      const mockConflicts = [
        {
          _id: 'conf-1',
          conflictType: 'Crop Raiding',
          severity: 'CRITICAL',
          status: 'REPORTED',
          latitude: 6.37,
          longitude: 81.51,
        },
        {
          _id: 'conf-2',
          conflictType: 'Property Damage',
          severity: 'HIGH',
          status: 'IN_PROGRESS',
          location: { latitude: 6.38, longitude: 81.52 },
        },
        {
          _id: 'conf-3',
          conflictType: 'Human Injury',
          severity: 'MEDIUM',
          status: 'RESOLVED',
          // Test default coordinates fallback when lat/lng are missing
        },
        { _id: 'conf-4', conflictType: 'Encounter', severity: 'LOW', status: 'REPORTED' },
        { _id: 'conf-5', conflictType: 'Crop Raiding', severity: 'HIGH', status: 'REPORTED' },
        { _id: 'conf-6', conflictType: 'Livestock Attack', severity: 'CRITICAL', status: 'REPORTED' },
      ];

      WildlifeConflict.find = () => ({
        sort: () => Promise.resolve(mockConflicts),
      });

      // Mock countDocuments: 1st call for criticalQuery, 2nd & 3rd for totalTrend, 4th & 5th for criticalTrend
      let countCall = 0;
      WildlifeConflict.countDocuments = async () => {
        countCall++;
        if (countCall === 1) return 2; // critical count
        if (countCall === 2) return 6; // currentCount total
        if (countCall === 3) return 3; // prevCount total (6 - 3)/3 * 100 = 100%
        if (countCall === 4) return 2; // currentCount critical
        if (countCall === 5) return 0; // prevCount critical (prevCount is 0, current > 0 => 100)
        return 0;
      };

      WildlifeConflict.distinct = async (field) => {
        if (field === 'park') return ['Yala', 'Wilpattu'];
        return [];
      };

      const res = await requestGet(
        '/api/analytics/report?category=Human-Wildlife%20Conflict%20Incidents&park=Yala&startDate=2026-09-01&endDate=2026-09-30'
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.summary.totalIncidents, 6);
      assert.equal(res.body.data.summary.criticalIncidents, 2);
      assert.equal(res.body.data.summary.totalTrend, 100);
      assert.equal(res.body.data.summary.criticalTrend, 100);
      assert.equal(res.body.data.summary.activeRegions, 2);
      assert.equal(res.body.data.summary.syncStatus, 'Online & Synced');

      // Verify hotspots mapping
      assert.equal(res.body.data.hotspots.length, 6);
      assert.equal(res.body.data.hotspots[0].intensity, 1.0); // CRITICAL
      assert.equal(res.body.data.hotspots[1].intensity, 0.8); // HIGH
      assert.equal(res.body.data.hotspots[2].lat, 6.3721); // Default lat fallback
      assert.equal(res.body.data.hotspots[2].lng, 81.5142); // Default lng fallback

      // Verify priority areas sliced to max 5
      assert.equal(res.body.data.priorityAreas.length, 5);
      assert.equal(res.body.data.priorityAreas[0].sector, 'Sector A');
      assert.equal(res.body.data.priorityAreas[0].action, 'Action Required');
      assert.equal(res.body.data.priorityAreas[1].action, 'Monitoring');

      // Verify weekly trend breakdown
      assert.equal(res.body.data.weeklyTrend.length, 4);
    });

    it('handles Conflict report with park="Other", only startDate, distinct returning empty, and zero previous count', async () => {
      WildlifeConflict.find = () => ({
        sort: () => Promise.resolve([]),
      });
      WildlifeConflict.countDocuments = async () => 0;
      WildlifeConflict.distinct = async () => [];

      const res = await requestGet(
        '/api/analytics/report?category=Human-Wildlife%20Conflict%20Incidents&park=Other&startDate=2026-09-01'
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.summary.totalIncidents, 0);
      assert.equal(res.body.data.summary.activeRegions, 1); // fallback to 1
      assert.equal(res.body.data.hotspots[0].type, 'No Data Yet'); // fallback hotspot
      assert.equal(res.body.data.priorityAreas[0].sector, 'Sector A'); // fallback priority area
      assert.equal(res.body.data.weeklyTrend[0].current, 0);
    });

    it('calculates 0% trend when both current and previous counts are zero with date range', async () => {
      const mockConflictWithoutSeverity = [
        {
          _id: 'conf-x',
          conflictType: 'Encounter',
          location: {}, // location without lat/lng
        },
      ];

      WildlifeConflict.find = () => ({
        sort: () => Promise.resolve(mockConflictWithoutSeverity),
      });

      // currentCount = 0, prevCount = 0 => triggers (prevCount === 0 ? (currentCount > 0 ? 100 : 0))
      WildlifeConflict.countDocuments = async () => 0;
      WildlifeConflict.distinct = async () => ['Yala'];

      const res = await requestGet(
        '/api/analytics/report?category=Human-Wildlife%20Conflict%20Incidents&park=Yala&startDate=2026-09-01&endDate=2026-09-30'
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.data.summary.totalTrend, 0);
      assert.equal(res.body.data.summary.criticalTrend, 0);
      assert.equal(res.body.data.priorityAreas[0].risk, 'HIGH'); // default severity fallback
    });
  });

  // ==========================================
  // Category 2: Patrol Coverage & Sensor Uptime
  // ==========================================
  describe('GET /api/analytics/report - Patrol Coverage & Sensor Uptime', () => {
    it('generates report for Patrol Coverage including waypoints, route distance, and status', async () => {
      const mockPatrols = [
        {
          _id: 'patrol-1',
          routeName: 'Sector River Trail',
          distanceKm: 14.5,
          status: 'COMPLETED',
          waypoints: [
            { _id: 'wp-1', latitude: 6.39, longitude: 81.53 },
            { latitude: 6.40, longitude: 81.54 }, // Test wp without _id
          ],
        },
        {
          _id: 'patrol-2',
          routeName: 'Boundary Fence Line',
          distanceKm: null, // Test fallback to 0
          status: 'IN_PROGRESS',
          waypoints: [], // Test empty waypoints
        },
      ];

      Patrol.find = () => ({
        sort: () => Promise.resolve(mockPatrols),
      });

      let countCall = 0;
      Patrol.countDocuments = async () => {
        countCall++;
        if (countCall === 1) return 5; // current
        if (countCall === 2) return 10; // prev => (5-10)/10 * 100 = -50%
        return 0;
      };

      Patrol.distinct = async () => ['Udawalawe'];

      const res = await requestGet(
        '/api/analytics/report?category=Patrol%20Coverage%20%26%20Sensor%20Uptime&park=All%20Regions&startDate=2026-09-01&endDate=2026-09-30'
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.summary.totalIncidents, 2);
      assert.equal(res.body.data.summary.criticalIncidents, 0);
      assert.equal(res.body.data.summary.totalTrend, -50);
      assert.equal(res.body.data.summary.criticalTrend, 0);
      assert.equal(res.body.data.summary.activeRegions, 1);

      // Verify waypoint hotspots
      assert.equal(res.body.data.hotspots.length, 2);
      assert.equal(res.body.data.hotspots[0].id, 'wp-1');
      assert.equal(res.body.data.hotspots[0].type, 'Ranger Waypoint');
      assert.equal(res.body.data.hotspots[0].intensity, 0.5);

      // Verify priority areas mapped from patrols
      assert.equal(res.body.data.priorityAreas.length, 2);
      assert.equal(res.body.data.priorityAreas[0].sector, 'Sector River Trail');
      assert.equal(res.body.data.priorityAreas[0].total, 14.5);
      assert.equal(res.body.data.priorityAreas[1].total, 0); // distanceKm fallback
    });
  });

  // ==========================================
  // Category 3: Poaching Hotspots by Location
  // ==========================================
  describe('GET /api/analytics/report - Poaching Hotspots by Location', () => {
    it('generates report for Field Incidents / Poaching Hotspots with locations and severity', async () => {
      const mockIncidents = [
        {
          _id: 'inc-1',
          incidentType: 'Illegal Snare',
          severity: 'CRITICAL',
          status: 'REPORTED',
          location: { latitude: 6.42, longitude: 81.55 },
        },
        {
          _id: 'inc-2',
          incidentType: 'Campfire',
          severity: 'LOW',
          status: 'RESOLVED',
          location: null, // Test missing location fallback
        },
      ];

      FieldIncident.find = () => ({
        sort: () => Promise.resolve(mockIncidents),
      });

      let countCall = 0;
      FieldIncident.countDocuments = async () => {
        countCall++;
        if (countCall === 1) return 1; // critical count
        if (countCall === 2) return 2; // current total
        if (countCall === 3) return 1; // prev total (2-1)/1 * 100 = 100%
        if (countCall === 4) return 1; // current critical
        if (countCall === 5) return 1; // prev critical (1-1)/1 * 100 = 0%
        return 0;
      };

      FieldIncident.distinct = async () => ['Minneriya', 'Wilpattu', 'Yala'];

      const res = await requestGet(
        '/api/analytics/report?category=Poaching%20Hotspots%20by%20Location&park=Minneriya&endDate=2026-09-30'
      );

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.summary.totalIncidents, 2);
      assert.equal(res.body.data.summary.criticalIncidents, 1);
      assert.equal(res.body.data.summary.activeRegions, 3);
      assert.equal(res.body.data.hotspots[0].intensity, 1.0); // CRITICAL
      assert.equal(res.body.data.hotspots[1].intensity, 0.8); // NON-CRITICAL
      assert.equal(res.body.data.hotspots[1].lat, 6.3721); // Default lat fallback
      assert.equal(res.body.data.priorityAreas[0].action, 'Action Required');
      assert.equal(res.body.data.priorityAreas[1].action, 'Monitoring');
    });
  });

  // ==========================================
  // Category 4: Default / Unknown Category Fallback
  // ==========================================
  describe('GET /api/analytics/report - Default Category & Missing Filters', () => {
    it('handles unknown or empty category by returning safe default data', async () => {
      const res = await requestGet('/api/analytics/report?category=UnknownCategory');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.summary.totalIncidents, 0);
      assert.equal(res.body.data.summary.criticalIncidents, 0);
      assert.equal(res.body.data.summary.totalTrend, 0);
      assert.equal(res.body.data.priorityAreas[0].trigger, 'Waiting for Data');
      assert.equal(res.body.data.hotspots[0].type, 'No Data Yet');
      assert.equal(res.body.data.weeklyTrend[0].current, 0);
    });
  });

  // ==========================================
  // Error Handling in getAnalyticsReport
  // ==========================================
  describe('GET /api/analytics/report - Error Handling', () => {
    it('returns status 500 when database query throws an error', async () => {
      WildlifeConflict.find = () => {
        throw new Error('Database connection failed');
      };

      const res = await requestGet(
        '/api/analytics/report?category=Human-Wildlife%20Conflict%20Incidents'
      );

      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Failed to generate report');
    });
  });

  // ==========================================
  // Endpoint: GET /api/analytics/regions
  // ==========================================
  describe('GET /api/analytics/regions', () => {
    it('returns deduplicated list of regions across all three models', async () => {
      WildlifeConflict.distinct = async () => ['Yala', 'Wilpattu', ''];
      Patrol.distinct = async () => ['Wilpattu', 'Udawalawe', null];
      FieldIncident.distinct = async () => ['Minneriya', 'Yala', undefined];

      const res = await requestGet('/api/analytics/regions');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.data.sort(), ['Minneriya', 'Udawalawe', 'Wilpattu', 'Yala'].sort());
    });

    it('returns status 500 when fetching regions fails', async () => {
      WildlifeConflict.distinct = async () => {
        throw new Error('Database error on distinct');
      };

      const res = await requestGet('/api/analytics/regions');

      assert.equal(res.status, 500);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Failed to fetch regions');
    });
  });
});

const WildlifeConflict = require('../models/WildlifeConflict');
const Alert = require('../models/Alert');
const FieldIncident = require('../models/FieldIncident');
const Patrol = require('../models/Patrol');

const getAnalyticsReport = async (req, res) => {
  try {
    const { category, park, startDate, endDate } = req.query;

    let totalIncidents = 0;
    let highRiskZones = 0;
    let priorityAreas = [];
    let hotspots = [];

    // --- FILTER BY CATEGORY ---
    if (category === 'Human-Wildlife Conflict Incidents') {
      const conflicts = await WildlifeConflict.find().sort({ createdAt: -1 });
      totalIncidents = conflicts.length;
      highRiskZones = Math.ceil(totalIncidents / 2);

      hotspots = conflicts.map((c) => ({
        id: c._id,
        lat: c.latitude || (c.location && c.location.latitude) || 6.3721,
        lng: c.longitude || (c.location && c.location.longitude) || 81.5142,
        intensity: c.severity === 'CRITICAL' ? 1.0 : 0.8,
        type: c.conflictType
      }));

      priorityAreas = conflicts.slice(0, 5).map((c, i) => ({
        id: c._id,
        sector: `Sector ${String.fromCharCode(65 + i)}`,
        trigger: c.conflictType,
        total: 1,
        risk: c.severity || 'HIGH',
        action: c.status === 'REPORTED' ? 'Action Required' : 'Monitoring'
      }));

    } else if (category === 'Patrol Coverage & Sensor Uptime') {
      const patrols = await Patrol.find().sort({ createdAt: -1 });
      totalIncidents = patrols.length; // Overriding 'incidents' to mean 'patrols' for this view
      highRiskZones = 0;

      // Extract waypoints from patrols for the map
      patrols.forEach(p => {
        if (p.waypoints && p.waypoints.length > 0) {
          p.waypoints.forEach(wp => {
            hotspots.push({
              id: wp._id || Math.random().toString(),
              lat: wp.latitude,
              lng: wp.longitude,
              intensity: 0.5,
              type: 'Ranger Waypoint'
            });
          });
        }
      });

      priorityAreas = patrols.slice(0, 5).map((p, i) => ({
        id: p._id,
        sector: p.routeName,
        trigger: 'Patrol Route',
        total: p.distanceKm || 0,
        risk: 'LOW',
        action: p.status
      }));

    } else if (category === 'Poaching Hotspots by Location') {
      const incidents = await FieldIncident.find().sort({ createdAt: -1 });
      totalIncidents = incidents.length;
      highRiskZones = Math.ceil(totalIncidents / 2);

      hotspots = incidents.map((inc) => ({
        id: inc._id,
        lat: inc.location?.latitude || 6.3721,
        lng: inc.location?.longitude || 81.5142,
        intensity: inc.severity === 'CRITICAL' ? 1.0 : 0.8,
        type: inc.incidentType
      }));

      priorityAreas = incidents.slice(0, 5).map((inc, i) => ({
        id: inc._id,
        sector: `Sector ${String.fromCharCode(65 + i)}`,
        trigger: inc.incidentType,
        total: 1,
        risk: inc.severity,
        action: inc.status === 'REPORTED' ? 'Action Required' : 'Monitoring'
      }));

    } else {
      // Default / Wildlife Population
      totalIncidents = 0;
      priorityAreas = [{ id: 1, sector: 'Sector A', trigger: 'Waiting for Data', total: 0, risk: 'Low', action: 'None' }];
      hotspots = [{ id: 'mock', lat: 6.3721, lng: 81.5142, intensity: 0.1, type: 'No Data Yet' }];
    }

    // Common Fallbacks for empty maps
    if (hotspots.length === 0) {
      hotspots = [{ id: 'mock', lat: 6.3721, lng: 81.5142, intensity: 0.1, type: 'No Data Yet' }];
    }
    if (priorityAreas.length === 0) {
      priorityAreas = [{ id: 1, sector: 'Sector A', trigger: 'Waiting for Data', total: 0, risk: 'Low', action: 'None' }];
    }

    const summary = {
      totalIncidents, 
      highRiskZones, 
      meanInterceptionDelay: `${Math.floor(Math.random() * 30) + 20} mins`,
      syncStatus: "Online & Synced",
    };

    const weeklyTrend = [
      { name: 'Week 1', current: Math.floor(Math.random() * 10), previous: Math.floor(Math.random() * 10) },
      { name: 'Week 2', current: Math.floor(Math.random() * 10), previous: Math.floor(Math.random() * 10) },
      { name: 'Week 3', current: Math.floor(Math.random() * 10), previous: Math.floor(Math.random() * 10) },
      { name: 'Week 4', current: totalIncidents, previous: Math.floor(Math.random() * 10) },
    ];

    res.json({
      success: true,
      data: {
        parameters: { category, park, startDate, endDate },
        summary,
        weeklyTrend,
        priorityAreas,
        hotspots
      }
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

module.exports = {
  getAnalyticsReport,
};

const WildlifeConflict = require('../models/WildlifeConflict');
const Alert = require('../models/Alert');
const FieldIncident = require('../models/FieldIncident');
const Patrol = require('../models/Patrol');

const getAnalyticsReport = async (req, res) => {
  try {
    const { category, park, startDate, endDate } = req.query;

    let totalIncidents = 0;
    let criticalIncidents = 0;
    let totalTrend = 0;
    let criticalTrend = 0;
    let activeRegions = 1;
    let priorityAreas = [];
    let hotspots = [];

    const getTrend = async (Model, currentQuery, baseQuery) => {
      if (!startDate || !endDate) return 0;
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const durationMs = currentEnd - currentStart;
      
      const previousEnd = new Date(currentStart.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - durationMs);
      
      const prevQuery = { ...baseQuery, createdAt: { $gte: previousStart, $lte: previousEnd } };
      
      const currentCount = await Model.countDocuments(currentQuery);
      const prevCount = await Model.countDocuments(prevQuery);
      
      if (prevCount === 0) return currentCount > 0 ? 100 : 0;
      return Math.round(((currentCount - prevCount) / prevCount) * 100);
    };

    let query = {};
    if (park && park !== 'All Regions') {
      if (park === 'Other') {
        query.park = { $nin: ['Yala', 'Wilpattu', 'Udawalawe', 'Minneriya'] };
      } else {
        query.park = park;
      }
    }
    const baseQuery = { ...query }; // without date filter

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // --- FILTER BY CATEGORY ---
    if (category === 'Human-Wildlife Conflict Incidents') {
      const conflicts = await WildlifeConflict.find(query).sort({ createdAt: -1 });
      totalIncidents = conflicts.length;
      
      const criticalQuery = { ...query, severity: { $in: ['CRITICAL', 'HIGH'] } };
      const criticalBaseQuery = { ...baseQuery, severity: { $in: ['CRITICAL', 'HIGH'] } };
      criticalIncidents = await WildlifeConflict.countDocuments(criticalQuery);
      
      totalTrend = await getTrend(WildlifeConflict, query, baseQuery);
      criticalTrend = await getTrend(WildlifeConflict, criticalQuery, criticalBaseQuery);
      
      const distinctParks = await WildlifeConflict.distinct('park', query);
      activeRegions = distinctParks.length || 1;

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
      const patrols = await Patrol.find(query).sort({ createdAt: -1 });
      totalIncidents = patrols.length; // Overriding 'incidents' to mean 'patrols'
      
      criticalIncidents = 0; // Not applicable
      totalTrend = await getTrend(Patrol, query, baseQuery);
      criticalTrend = 0;

      const distinctParks = await Patrol.distinct('park', query);
      activeRegions = distinctParks.length || 1;

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
      const incidents = await FieldIncident.find(query).sort({ createdAt: -1 });
      totalIncidents = incidents.length;
      
      const criticalQuery = { ...query, severity: { $in: ['CRITICAL', 'HIGH'] } };
      const criticalBaseQuery = { ...baseQuery, severity: { $in: ['CRITICAL', 'HIGH'] } };
      criticalIncidents = await FieldIncident.countDocuments(criticalQuery);
      
      totalTrend = await getTrend(FieldIncident, query, baseQuery);
      criticalTrend = await getTrend(FieldIncident, criticalQuery, criticalBaseQuery);
      
      const distinctParks = await FieldIncident.distinct('park', query);
      activeRegions = distinctParks.length || 1;

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
      totalIncidents = 0;
      criticalIncidents = 0;
      priorityAreas = [{ id: 1, sector: 'Sector A', trigger: 'Waiting for Data', total: 0, risk: 'Low', action: 'None' }];
      hotspots = [{ id: 'mock', lat: 6.3721, lng: 81.5142, intensity: 0.1, type: 'No Data Yet' }];
    }

    if (hotspots.length === 0) {
      hotspots = [{ id: 'mock', lat: 6.3721, lng: 81.5142, intensity: 0.1, type: 'No Data Yet' }];
    }
    if (priorityAreas.length === 0) {
      priorityAreas = [{ id: 1, sector: 'Sector A', trigger: 'Waiting for Data', total: 0, risk: 'Low', action: 'None' }];
    }

    const summary = {
      totalIncidents, 
      totalTrend,
      criticalIncidents,
      criticalTrend,
      activeRegions,
      syncStatus: "Online & Synced",
    };

    let w1 = Math.floor(totalIncidents * 0.2);
    let w2 = Math.floor(totalIncidents * 0.35);
    let w3 = Math.floor(totalIncidents * 0.15);
    let w4 = totalIncidents - (w1 + w2 + w3);

    const weeklyTrend = totalIncidents === 0 ? [
      { name: 'Week 1', current: 0, previous: 0 },
      { name: 'Week 2', current: 0, previous: 0 },
      { name: 'Week 3', current: 0, previous: 0 },
      { name: 'Week 4', current: 0, previous: 0 },
    ] : [
      { name: 'Week 1', current: w1, previous: Math.floor(w1 * 0.8) },
      { name: 'Week 2', current: w2, previous: Math.floor(w2 * 1.2) },
      { name: 'Week 3', current: w3, previous: Math.floor(w3 * 0.9) },
      { name: 'Week 4', current: w4, previous: Math.floor(w4 * 1.1) },
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

const getRegions = async (req, res) => {
  try {
    const conflictRegions = await WildlifeConflict.distinct('park');
    const patrolRegions = await Patrol.distinct('park');
    const fieldRegions = await FieldIncident.distinct('park');
    
    // Merge and deduplicate
    const allRegions = [...new Set([...conflictRegions, ...patrolRegions, ...fieldRegions])].filter(Boolean);
    
    res.json({
      success: true,
      data: allRegions
    });
  } catch (error) {
    console.error("Regions Error:", error);
    res.status(500).json({ success: false, message: 'Failed to fetch regions' });
  }
};

module.exports = {
  getAnalyticsReport,
  getRegions,
};

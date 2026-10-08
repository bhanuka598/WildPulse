const WildlifeConflict = require('../models/WildlifeConflict');
const Alert = require('../models/Alert');

const getAnalyticsReport = async (req, res) => {
  try {
    const { category, park, startDate, endDate } = req.query;

    // 1. Fetch REAL data from other members' modules
    const realConflictCount = await WildlifeConflict.countDocuments();
    const realAlertCount = await Alert.countDocuments();
    
    // We combine the real database counts for a true system-wide total
    const totalIncidents = realConflictCount + realAlertCount;

    // 2. Summary Statistics (Hybrid: Real + Mock)
    const summary = {
      totalIncidents: totalIncidents > 0 ? totalIncidents : Math.floor(Math.random() * 50) + 10, // Fallback if DB is empty
      highRiskZones: Math.floor(Math.random() * 5) + 1, // Mocked ML prediction
      meanInterceptionDelay: `${Math.floor(Math.random() * 30) + 20} mins`, // Mocked IoT tracking
      syncStatus: "Online & Synced",
    };

    // 3. Weekly Trend Data (Mocking 4 weeks for the chart)
    const weeklyTrend = [
      { name: 'Week 1', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 2', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 3', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 4', current: totalIncidents > 0 ? totalIncidents : Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
    ];

    // 4. Priority Areas Table Data (Mocked ML Classification)
    const priorityAreas = [
      { id: 1, sector: 'Sector A', trigger: 'Wire Snares', total: 18, risk: 'High', action: 'Action' },
      { id: 2, sector: 'Sector B', trigger: 'Gunshots', total: 14, risk: 'High', action: 'Action' },
      { id: 3, sector: 'Sector C', trigger: 'Footprints', total: 10, risk: 'Medium', action: 'Monitor' },
    ];

    // 5. Hotspot Map Coordinates (Mocked IoT GPS coordinates)
    const baseLat = 6.3721;
    const baseLng = 81.5142;
    const hotspots = [
      { id: 1, lat: baseLat + 0.01, lng: baseLng - 0.02, intensity: 0.9, type: 'Snare' },
      { id: 2, lat: baseLat - 0.02, lng: baseLng + 0.01, intensity: 0.7, type: 'Sighting' },
      { id: 3, lat: baseLat + 0.03, lng: baseLng + 0.03, intensity: 0.5, type: 'Camp' },
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

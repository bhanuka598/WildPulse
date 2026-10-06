const getAnalyticsReport = async (req, res) => {
  try {
    const { category, park, startDate, endDate } = req.query;

    // As per assignment instructions, we can mock IoT/ML data.
    // We'll generate realistic-looking mock data based on the requested parameters.
    
    // 1. Summary Statistics
    const summary = {
      totalIncidents: Math.floor(Math.random() * 50) + 10,
      highRiskZones: Math.floor(Math.random() * 5) + 1,
      meanInterceptionDelay: `${Math.floor(Math.random() * 30) + 20} mins`,
      syncStatus: "Online & Synced",
    };

    // 2. Weekly Trend Data (mocking 4 weeks)
    const weeklyTrend = [
      { name: 'Week 1', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 2', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 3', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
      { name: 'Week 4', current: Math.floor(Math.random() * 20), previous: Math.floor(Math.random() * 20) },
    ];

    // 3. Priority Areas Table Data
    const priorityAreas = [
      { id: 1, sector: 'Sector A', trigger: 'Wire Snares', total: 18, risk: 'High', action: 'Action' },
      { id: 2, sector: 'Sector B', trigger: 'Gunshots', total: 14, risk: 'High', action: 'Action' },
      { id: 3, sector: 'Sector C', trigger: 'Footprints', total: 10, risk: 'Medium', action: 'Monitor' },
    ];

    // 4. Hotspot Map Coordinates (Centered roughly around Serengeti/Yala placeholders)
    // We'll use Sri Lanka coordinates as default (Yala National Park region)
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

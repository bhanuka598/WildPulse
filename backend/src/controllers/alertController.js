const Alert = require('../models/Alert');

exports.getAlerts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.unread === 'true') filter.isRead = false;
    const alerts = await Alert.find(filter).sort('-createdAt').limit(200);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) { next(err); }
};

exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true, acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, alert });
  } catch (err) { next(err); }
};

// POST /api/alerts/check-high-risk
exports.checkHighRiskZone = async (req, res, next) => {
  try {
    const { latitude, longitude, animalId } = req.body;
    // Simple stub — in real life use geofencing collection
    // If in zone:
    const alert = await Alert.create({
      type: 'HIGH_RISK_ZONE',
      severity: 'HIGH',
      title: 'Animal entered high-risk zone',
      message: `Animal ${animalId} near community at ${latitude},${longitude}`,
      latitude,
      longitude,
      relatedAnimal: animalId,
    });
    res.json({ success: true, alert });
  } catch (err) { next(err); }
};
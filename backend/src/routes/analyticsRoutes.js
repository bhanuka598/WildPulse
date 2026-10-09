const express = require('express');
const router = express.Router();
const { getAnalyticsReport, getRegions } = require('../controllers/analyticsController');

// GET /api/analytics/report
router.get('/report', getAnalyticsReport);

// GET /api/analytics/regions
router.get('/regions', getRegions);

module.exports = router;

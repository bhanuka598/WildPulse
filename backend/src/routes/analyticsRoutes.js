const express = require('express');
const router = express.Router();
const { getAnalyticsReport } = require('../controllers/analyticsController');

// GET /api/analytics/report
router.get('/report', getAnalyticsReport);

module.exports = router;

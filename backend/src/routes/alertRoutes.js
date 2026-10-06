const express = require('express');
const ctrl = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getAlerts);
router.put('/:id/acknowledge', ctrl.acknowledgeAlert);
router.post('/check-high-risk', ctrl.checkHighRiskZone);

module.exports = router;
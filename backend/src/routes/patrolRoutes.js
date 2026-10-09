const express = require('express');
const ctrl = require('../controllers/patrolController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/start', ctrl.startPatrol);
router.post('/:id/waypoints', ctrl.addWaypoints);
router.post('/:id/complete', ctrl.completePatrol);
router.get('/', ctrl.getPatrols);
router.get('/:id', ctrl.getPatrolById);

module.exports = router;

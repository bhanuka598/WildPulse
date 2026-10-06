const express = require('express');
const ctrl = require('../controllers/conflictController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Public report (community members)
router.post('/', upload.single('image'), ctrl.createConflict);
// Public report tracking (for community members to track their submission by ID)
router.get('/public/:id', ctrl.getConflictById);

// Protected routes
router.get('/', protect, ctrl.getConflicts);
router.get('/:id', protect, ctrl.getConflictById);
router.put('/:id/assign', protect, authorize('PARK_MANAGER', 'COMMUNITY_LIAISON_OFFICER'), ctrl.assignRanger);
router.put('/:id/status', protect, ctrl.updateConflictStatus);

module.exports = router;
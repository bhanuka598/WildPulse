const express = require('express');
const ctrl = require('../controllers/fieldIncidentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', upload.array('images', 5), ctrl.createFieldIncident);
router.post('/sync-bulk', ctrl.syncBulkFieldIncidents);
router.get('/', ctrl.getFieldIncidents);
router.patch('/:id/status', ctrl.updateFieldIncidentStatus);

module.exports = router;

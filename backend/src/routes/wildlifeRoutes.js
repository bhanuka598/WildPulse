const express = require('express');
const ctrl = require('../controllers/wildlifeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();
const managers = authorize('PARK_MANAGER', 'ADMIN');
const field = authorize('RANGER', 'ADMIN');
const readers = authorize('PARK_MANAGER', 'ADMIN', 'RANGER');

function demoOnly(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Demo simulation is disabled in production' });
  }
  return next();
}

router.get('/demo-assets/camera-trap.svg', ctrl.demoAsset);

router.use(protect);

router.get('/overview', readers, ctrl.overview);
router.get('/animals', readers, ctrl.listAnimals);
router.get('/animals/:id/telemetry', readers, ctrl.animalTelemetry);
router.get('/animals/:id', readers, ctrl.getAnimal);
router.get('/sensors', readers, ctrl.listSensors);
router.get('/sensors/:id', readers, ctrl.getSensor);
router.get('/zones', readers, ctrl.listZones);

router.get('/alerts', readers, ctrl.listAlerts);
router.get('/alerts/:id/audit', readers, ctrl.alertAudit);
router.get('/alerts/:id', readers, ctrl.getAlert);
router.patch('/alerts/:id/acknowledge', managers, ctrl.acknowledge);
router.patch('/alerts/:id/resolve', managers, ctrl.resolve);

router.get('/response-units', managers, ctrl.responseUnits);
router.get('/dispatches', readers, ctrl.listDispatches);
router.post('/dispatches', managers, ctrl.createDispatch);
router.get('/my-dispatches', field, ctrl.myDispatches);
router.get('/dispatches/:id', readers, ctrl.getDispatch);
router.patch('/dispatches/:id/accept', field, ctrl.acceptDispatch);
router.patch('/dispatches/:id/start', field, ctrl.startDispatch);
router.patch('/dispatches/:id/progress', field, ctrl.progressDispatch);
router.patch('/dispatches/:id/complete', field, upload.single('photo'), ctrl.completeDispatch);

router.post('/demo/reset', demoOnly, managers, ctrl.resetDemo);
router.post('/demo/scenarios/:code', demoOnly, managers, ctrl.runScenario);
router.post('/demo/playback', demoOnly, managers, ctrl.playback);
router.get('/demo/log', demoOnly, managers, ctrl.demoLog);
router.post('/demo/sensors/:id/status', demoOnly, managers, ctrl.simulateSensor);

module.exports = router;

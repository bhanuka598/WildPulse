const mongoose = require('mongoose');

const ACTIVE_STATUSES = ['NEW', 'ACKNOWLEDGED', 'RESPONSE_DISPATCHED', 'IN_PROGRESS'];

const wildlifeAlertSchema = new mongoose.Schema(
  {
    alertId: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: [
        'HIGH_RISK_BOUNDARY',
        'CAMERA_TRAP_POACHING',
        'SENSOR_OFFLINE',
        'GPS_SIGNAL_LOST',
        'WILDLIFE_PROXIMITY',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'WildlifeAnimal', default: null },
    sensor: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackingSensor', default: null },
    animalCode: { type: String, default: '' },
    sensorCode: { type: String, default: '' },
    species: { type: String, default: '' },
    park: { type: String, default: '' },
    zone: { type: mongoose.Schema.Types.ObjectId, ref: 'ProtectedZone', default: null },
    zoneName: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    distanceToVillageKm: { type: Number, min: 0 },
    nearestVillage: { type: String, default: '' },
    detectedAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['NEW', 'ACKNOWLEDGED', 'RESPONSE_DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
      default: 'NEW',
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: Date,
    resolvedAt: Date,
    resolutionReason: {
      type: String,
      enum: [
        'ANIMAL_RETREATED',
        'AREA_SECURED',
        'FALSE_ALARM',
        'MAINTENANCE_COMPLETE',
        'RESPONSE_COMPLETED',
        'OTHER',
      ],
    },
    resolutionNotes: { type: String, default: '' },
    evidence: {
      imageUrl: { type: String, default: '' },
      capturedAt: Date,
      cameraId: { type: String, default: '' },
      locationLabel: { type: String, default: '' },
      detectionCategory: { type: String, default: '' },
      simulated: { type: Boolean, default: true },
      available: { type: Boolean, default: false },
    },
    dedupeKey: { type: String, required: true },
    threatClassification: { type: String, default: '' },
    recommendedAction: { type: String, default: '' },
    sensorReliability: { type: String, default: 'SIMULATED' },
    movementSpeed: { type: Number, default: 0 },
    batteryLevel: { type: Number },
    activeDispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchOrder', default: null },
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

wildlifeAlertSchema.index({ location: '2dsphere' });
wildlifeAlertSchema.index({ status: 1, detectedAt: -1 });
wildlifeAlertSchema.index({ category: 1, severity: 1 });
wildlifeAlertSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ACTIVE_STATUSES } },
  }
);

module.exports = mongoose.model('WildlifeAlert', wildlifeAlertSchema);
module.exports.ACTIVE_ALERT_STATUSES = ACTIVE_STATUSES;

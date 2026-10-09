const mongoose = require('mongoose');

const trackingSensorSchema = new mongoose.Schema(
  {
    sensorId: { type: String, required: true, unique: true, trim: true },
    sensorType: {
      type: String,
      enum: ['GPS_COLLAR', 'CAMERA_TRAP'],
      required: true,
    },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'WildlifeAnimal', default: null },
    animalCode: { type: String, default: null },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'MAINTENANCE'],
      default: 'ONLINE',
    },
    batteryLevel: { type: Number, min: 0, max: 100 },
    signalStrength: { type: Number, min: 0, max: 100 },
    lastHeartbeatAt: Date,
    park: { type: String, default: 'Yala' },
    maintenanceWarning: { type: String, default: '' },
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trackingSensorSchema.index({ location: '2dsphere' });
trackingSensorSchema.index({ status: 1, sensorType: 1 });

module.exports = mongoose.model('TrackingSensor', trackingSensorSchema);

const mongoose = require('mongoose');

const sensorTelemetrySchema = new mongoose.Schema(
  {
    sensor: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackingSensor' },
    sensorCode: { type: String, required: true },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'WildlifeAnimal' },
    animalCode: { type: String },
    coordinates: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    speed: { type: Number, min: 0, default: 0 },
    batteryLevel: { type: Number, min: 0, max: 100 },
    recordedAt: { type: Date, required: true },
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sensorTelemetrySchema.index({ coordinates: '2dsphere' });
sensorTelemetrySchema.index({ animal: 1, recordedAt: -1 });
sensorTelemetrySchema.index({ sensorCode: 1, recordedAt: -1 });

module.exports = mongoose.model('SensorTelemetry', sensorTelemetrySchema);

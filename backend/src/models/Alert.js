const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['HIGH_RISK_ZONE', 'SENSOR_TRIGGER', 'POACHING_SUSPECTED', 'ANIMAL_DISTRESS', 'SYSTEM'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    latitude: Number,
    longitude: Number,
    relatedSensor: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor' },
    relatedAnimal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
    relatedIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
    isRead: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
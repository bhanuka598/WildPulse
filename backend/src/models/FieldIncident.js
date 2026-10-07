const mongoose = require('mongoose');

const fieldIncidentSchema = new mongoose.Schema(
  {
    patrolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patrol',
      required: false,
    },
    rangerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    incidentType: {
      type: String,
      enum: ['SNARE_TRAP', 'POACHING_SIGN', 'INJURED_ANIMAL', 'TRESPASSING', 'ILLEGAL_LOGGING', 'OTHER'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    images: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['REPORTED', 'UNDER_INVESTIGATION', 'RESOLVED'],
      default: 'REPORTED',
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    isSyncedOffline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FieldIncident', fieldIncidentSchema);

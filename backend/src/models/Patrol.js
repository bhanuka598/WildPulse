const mongoose = require('mongoose');

const patrolSchema = new mongoose.Schema(
  {
    rangerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    park: { 
      type: String, 
      default: 'Yala' 
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    waypoints: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    distanceKm: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patrol', patrolSchema);

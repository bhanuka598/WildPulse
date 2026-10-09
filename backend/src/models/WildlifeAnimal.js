const mongoose = require('mongoose');

const wildlifeAnimalSchema = new mongoose.Schema(
  {
    animalId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    species: { type: String, required: true, trim: true },
    collarId: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    park: { type: String, default: 'Yala' },
    lastLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
    lastSeenAt: Date,
    batteryLevel: { type: Number, min: 0, max: 100 },
    movementStatus: {
      type: String,
      enum: ['STATIONARY', 'MOVING', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    speedKmh: { type: Number, min: 0, default: 0 },
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

wildlifeAnimalSchema.index({ lastLocation: '2dsphere' });
wildlifeAnimalSchema.index({ species: 1, park: 1 });

module.exports = mongoose.model('WildlifeAnimal', wildlifeAnimalSchema);

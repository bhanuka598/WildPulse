const mongoose = require('mongoose');

const fieldResponseUnitSchema = new mongoose.Schema(
  {
    unitId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    assignedRanger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unitType: {
      type: String,
      enum: ['ANTI_POACHING', 'RANGER_PATROL', 'VETERINARY'],
      required: true,
    },
    availability: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'OFF_DUTY'],
      default: 'AVAILABLE',
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    lastUpdatedAt: { type: Date, default: Date.now },
    park: { type: String, default: 'Yala' },
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

fieldResponseUnitSchema.index({ currentLocation: '2dsphere' });
fieldResponseUnitSchema.index({ availability: 1, assignedRanger: 1 });

module.exports = mongoose.model('FieldResponseUnit', fieldResponseUnitSchema);

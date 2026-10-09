const mongoose = require('mongoose');

const protectedZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    park: { type: String, required: true, trim: true },
    zoneType: {
      type: String,
      enum: ['PROTECTED', 'HIGH_RISK', 'VILLAGE'],
      required: true,
    },
    geometry: {
      type: { type: String, enum: ['Polygon'], required: true },
      coordinates: { type: [[[Number]]], required: true },
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    villageName: { type: String, default: '' },
    villageLocation: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number], default: undefined },
    },
  },
  { timestamps: true }
);

protectedZoneSchema.index({ geometry: '2dsphere' });
protectedZoneSchema.index({ park: 1, zoneType: 1 });

module.exports = mongoose.model('ProtectedZone', protectedZoneSchema);

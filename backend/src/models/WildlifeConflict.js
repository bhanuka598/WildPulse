const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      index: true,
    },
    reporterName: String,
    reporterPhone: String,
    reporterType: {
      type: String,
      enum: ['COMMUNITY_MEMBER', 'RANGER', 'LIAISON_OFFICER', 'ANONYMOUS'],
      default: 'COMMUNITY_MEMBER',
    },
    conflictType: {
      type: String,
      enum: ['CROP_DAMAGE', 'LIVESTOCK_ATTACK', 'PROPERTY_DAMAGE', 'HUMAN_INJURY', 'SIGHTING', 'CROP_RAIDING', 'WILD_ANIMAL_NEAR_VILLAGE', 'OTHER'],
      required: true,
    },
    description: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    park: { 
      type: String, 
      default: 'Yala' 
    },
    villageArea: { type: String, default: '' },
    nearbyLandmark: { type: String, default: '' },
    animalSpecies: { type: String, default: 'Elephant' },
    imageUrl: String,
    incidentDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
      default: 'REPORTED',
    },
    assignedRanger: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolutionNotes: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

// Auto-generate reportId like WC-2026-00125 if not provided
conflictSchema.pre('save', function (next) {
  if (!this.reportId) {
    const randomSuffix = Math.floor(1000 + Math.random() * 90000);
    this.reportId = `WC-${new Date().getFullYear()}-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.model('WildlifeConflict', conflictSchema);
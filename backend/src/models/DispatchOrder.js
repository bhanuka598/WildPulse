const mongoose = require('mongoose');

const dispatchOrderSchema = new mongoose.Schema(
  {
    dispatchId: { type: String, required: true, unique: true, trim: true },
    alert: { type: mongoose.Schema.Types.ObjectId, ref: 'WildlifeAlert', required: true },
    responseUnit: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldResponseUnit', required: true },
    assignedRanger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
    },
    targetLocation: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true },
    },
    directives: {
      targetLocationText: { type: String, default: '' },
      responsePriority: { type: String, default: '' },
      animalWarning: { type: String, default: '' },
      safetyInstructions: { type: String, default: '' },
      officerNotes: { type: String, default: '' },
      communicationInstructions: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    dispatchedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    responseNotes: { type: String, default: '' },
    outcome: {
      type: String,
      enum: [
        'ANIMAL_MOVED_AWAY',
        'BOUNDARY_INSPECTED',
        'AREA_SECURED',
        'POACHING_REPORTED',
        'FURTHER_ASSISTANCE',
      ],
    },
    photoUrl: { type: String, default: '' },
    photoStored: { type: Boolean, default: false },
    idempotencyKey: { type: String },
    distanceKm: { type: Number },
    distanceLabel: { type: String, default: 'straight-line' },
    history: [
      {
        status: String,
        at: { type: Date, default: Date.now },
        note: String,
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    simulationFlag: { type: Boolean, default: true },
  },
  { timestamps: true }
);

dispatchOrderSchema.index({ assignedRanger: 1, status: 1, dispatchedAt: -1 });
dispatchOrderSchema.index({ alert: 1, status: 1 });
dispatchOrderSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('DispatchOrder', dispatchOrderSchema);

const mongoose = require('mongoose');

const wildlifeAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    previousState: { type: mongoose.Schema.Types.Mixed, default: null },
    newState: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

wildlifeAuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
wildlifeAuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('WildlifeAuditLog', wildlifeAuditLogSchema);

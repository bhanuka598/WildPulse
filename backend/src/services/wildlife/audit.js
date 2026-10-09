const WildlifeAuditLog = require('../../models/WildlifeAuditLog');

async function writeAudit({ actorId = null, entityType, entityId, action, previousState = null, newState = null, metadata = {} }) {
  return WildlifeAuditLog.create({
    actorId,
    entityType,
    entityId: String(entityId),
    action,
    previousState,
    newState,
    timestamp: new Date(),
    metadata,
  });
}

module.exports = { writeAudit };

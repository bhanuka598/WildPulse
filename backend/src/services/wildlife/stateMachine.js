const ALERT_STATUSES = ['NEW', 'ACKNOWLEDGED', 'RESPONSE_DISPATCHED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'];
const DISPATCH_STATUSES = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const ALERT_TRANSITIONS = {
  NEW: ['ACKNOWLEDGED', 'RESOLVED', 'CANCELLED', 'RESPONSE_DISPATCHED'],
  ACKNOWLEDGED: ['RESPONSE_DISPATCHED', 'RESOLVED', 'CANCELLED'],
  RESPONSE_DISPATCHED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  CANCELLED: [],
};

const DISPATCH_TRANSITIONS = {
  ASSIGNED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const RETREAT_ALLOWED = new Set(['NEW', 'ACKNOWLEDGED']);

function canTransition(map, from, to) {
  return (map[from] || []).includes(to);
}

function assertAlertTransition(from, to, reason) {
  if (to === 'RESOLVED' && reason === 'ANIMAL_RETREATED' && !RETREAT_ALLOWED.has(from)) {
    const error = new Error('Animal Retreated is only available before a response is dispatched');
    error.statusCode = 409;
    throw error;
  }
  if (!canTransition(ALERT_TRANSITIONS, from, to)) {
    const error = new Error(`Invalid alert transition from ${from} to ${to}`);
    error.statusCode = 409;
    throw error;
  }
}

function assertDispatchTransition(from, to) {
  if (!canTransition(DISPATCH_TRANSITIONS, from, to)) {
    const error = new Error(`Invalid dispatch transition from ${from} to ${to}`);
    error.statusCode = 409;
    throw error;
  }
}

module.exports = {
  ALERT_STATUSES,
  DISPATCH_STATUSES,
  ALERT_TRANSITIONS,
  DISPATCH_TRANSITIONS,
  assertAlertTransition,
  assertDispatchTransition,
};

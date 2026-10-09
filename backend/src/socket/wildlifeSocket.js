const jwt = require('jsonwebtoken');
const User = require('../models/User');

function registerWildlifeSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id role name');
      if (user) socket.data.wildlifeUser = user;
      return next();
    } catch (error) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.wildlifeUser;
    if (!user) return;
    if (user.role === 'PARK_MANAGER' || user.role === 'ADMIN') {
      socket.join('wildlife:managers');
    }
    socket.join(`wildlife:ranger:${user._id}`);
  });
}

function emitWildlife(io, event, payload, rangerIds = []) {
  if (!io || typeof io.to !== 'function') return;
  io.to('wildlife:managers').emit(event, payload);
  const unique = [...new Set(rangerIds.filter(Boolean).map(String))];
  unique.forEach((id) => {
    io.to(`wildlife:ranger:${id}`).emit(event, payload);
  });
}

module.exports = { registerWildlifeSocket, emitWildlife };

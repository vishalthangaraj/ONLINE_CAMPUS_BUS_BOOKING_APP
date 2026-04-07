function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on('joinTrip', (tripId) => {
      socket.join(`trip:${tripId}`);
    });

    socket.on('leaveTrip', (tripId) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on('busLocationUpdate', ({ tripId, location, nextStop, etaMessage }) => {
      io.to(`trip:${tripId}`).emit('busLocationUpdate', {
        tripId,
        location,
        nextStop,
        etaMessage,
      });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected', socket.id);
    });
  });
}

module.exports = { setupSocket };

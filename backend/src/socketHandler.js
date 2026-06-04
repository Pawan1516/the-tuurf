module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('verify:qr', async (payload, ack) => {
      // Minimal example - in real app verify token + match
      const { matchId } = payload || {};
      if (!matchId) return ack && ack({ error: 'missing matchId' });
      socket.join(`match:${matchId}`);
      socket.join(`scorer:${socket.id}`);
      io.to(`match:${matchId}`).emit('match:verified', { matchId });
      ack && ack({ ok: true });
    });

    socket.on('ball:event', (ball, ack) => {
      // persist ball via API or repo (omitted here)
      const matchRoom = `match:${ball.matchId}`;
      io.to(matchRoom).emit('timeline:append', { ball });
      io.to(matchRoom).emit('score:update', { matchId: ball.matchId });
      ack && ack({ ok: true });
    });

    socket.on('disconnect', () => {
      console.log('socket disconnect', socket.id);
    });
  });
};

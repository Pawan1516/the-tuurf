import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { matchService } from '../services/MatchService';

export function setupMatchSocket(io: Server) {
  const matchNamespace = io.of('/matches');

  // Middleware for authentication
  matchNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  matchNamespace.on('connection', (socket: Socket) => {
    console.log(`User ${socket.userId} connected to matches namespace`);

    // Join match room
    socket.on('match:join', (data: { matchId: string }) => {
      socket.join(`match:${data.matchId}`);
      socket.emit('match:joined', { status: 'connected', matchId: data.matchId });
    });

    // Ball scoring
    socket.on('ball:submit', async (data: any) => {
      try {
        const result = await matchService.scoreBall(data.matchId, data.ballData);
        matchNamespace.to(`match:${data.matchId}`).emit('ball:scored', result.data);
      } catch (error) {
        socket.emit('error', { message: 'Failed to score ball' });
      }
    });

    // Wicket
    socket.on('wicket:submit', (data: any) => {
      matchNamespace.to(`match:${data.matchId}`).emit('wicket:taken', {
        player: data.playerName,
        bowler: data.bowler,
        dismissalMode: data.mode,
        timestamp: new Date()
      });
    });

    // Over completion
    socket.on('over:completed', (data: any) => {
      matchNamespace.to(`match:${data.matchId}`).emit('over:completed', {
        overNumber: data.overNumber,
        totalRuns: data.totalRuns,
        bowler: data.bowler,
        timestamp: new Date()
      });
    });

    // Match completion
    socket.on('match:end', async (data: any) => {
      try {
        matchNamespace.to(`match:${data.matchId}`).emit('match:completed', {
          winner: data.winner,
          margin: data.margin,
          timestamp: new Date()
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to end match' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from matches`);
    });
  });
}

export function setupCommentarySocket(io: Server) {
  const commentaryNamespace = io.of('/commentary');

  commentaryNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  commentaryNamespace.on('connection', (socket: Socket) => {
    console.log(`User connected to commentary: ${socket.userId}`);

    // Add commentary
    socket.on('commentary:add', (data: any) => {
      const commentary = {
        id: `COM_${Date.now()}`,
        text: data.text,
        ballNumber: data.ballNumber,
        commentator: socket.userId,
        timestamp: new Date(),
        type: data.type || 'general'
      };

      commentaryNamespace.to(`match:${data.matchId}`).emit('commentary:added', commentary);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected from commentary: ${socket.userId}`);
    });
  });
}

export function setupNotificationSocket(io: Server) {
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.id;
      socket.join(`user:${decoded.id}`);
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  notificationNamespace.on('connection', (socket: Socket) => {
    console.log(`User ${socket.userId} connected to notifications`);

    socket.on('notification:read', (data: { notificationId: string }) => {
      // Mark notification as read in DB
      console.log(`Notification ${data.notificationId} marked as read`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected from notifications`);
    });
  });
}

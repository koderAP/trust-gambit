import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/prisma';

export class SocketServer {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join lobby room
      socket.on('join:lobby', async (lobbyId: string) => {
        socket.join(`lobby:${lobbyId}`);
        console.log(`User ${socket.id} joined lobby ${lobbyId}`);
        
        // Send current lobby status
        const lobby = await prisma.lobby.findUnique({
          where: { id: lobbyId },
          include: { users: true, games: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });
        
        socket.emit('lobby:status', lobby);
        this.io.to(`lobby:${lobbyId}`).emit('lobby:user_joined', {
          userCount: lobby?.users.length || 0,
        });
      });

      // Join game room
      socket.on('join:game', async (gameId: string) => {
        socket.join(`game:${gameId}`);
        console.log(`User ${socket.id} joined game ${gameId}`);
      });

      // Handle round submission
      socket.on('round:submit', async (data: {
        roundId: string;
        userId: string;
        action: 'SOLVE' | 'DELEGATE' | 'PASS';
        answer?: string;
        delegateTo?: string;
      }) => {
        try {
          // Create submission
          const submission = await prisma.submission.create({
            data: {
              roundId: data.roundId,
              userId: data.userId,
              action: data.action,
              answer: data.answer,
              delegateTo: data.delegateTo,
            },
          });

          // Get round info
          const round = await prisma.round.findUnique({
            where: { id: data.roundId },
            include: { game: true },
          });

          if (round) {
            // Notify game room about submission
            this.io.to(`game:${round.gameId}`).emit('round:submission', {
              userId: data.userId,
              submissionCount: await prisma.submission.count({
                where: { roundId: data.roundId },
              }),
            });
          }

          socket.emit('round:submit_success', submission);
        } catch (error) {
          socket.emit('round:submit_error', { error: 'Submission failed' });
        }
      });

      // Admin: Start round
      socket.on('admin:start_round', async (data: { roundId: string }) => {
        try {
          const round = await prisma.round.update({
            where: { id: data.roundId },
            data: {
              status: 'ACTIVE',
              startTime: new Date(),
            },
            include: { game: true },
          });

          // Notify all users in game
          this.io.to(`game:${round.gameId}`).emit('round:started', {
            roundId: round.id,
            roundNumber: round.roundNumber,
            question: round.question,
            durationSeconds: round.durationSeconds,
            startTime: round.startTime,
          });
        } catch (error) {
          socket.emit('admin:error', { error: 'Failed to start round' });
        }
      });

      // Admin: End round
      socket.on('admin:end_round', async (data: { roundId: string }) => {
        try {
          const round = await prisma.round.update({
            where: { id: data.roundId },
            data: {
              status: 'COMPLETED',
              endTime: new Date(),
            },
            include: { game: true },
          });

          // Notify all users in game
          this.io.to(`game:${round.gameId}`).emit('round:ended', {
            roundId: round.id,
          });
        } catch (error) {
          socket.emit('admin:error', { error: 'Failed to end round' });
        }
      });

      // Timer sync
      socket.on('round:timer_sync', (data: { roundId: string; remainingSeconds: number }) => {
        const round = prisma.round.findUnique({ where: { id: data.roundId }, include: { game: true } });
        round.then((r) => {
          if (r) {
            this.io.to(`game:${r.gameId}`).emit('round:timer_update', {
              roundId: data.roundId,
              remainingSeconds: data.remainingSeconds,
            });
          }
        });
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  getIO() {
    return this.io;
  }

  // Broadcast to specific game
  broadcastToGame(gameId: string, event: string, data: any) {
    this.io.to(`game:${gameId}`).emit(event, data);
  }

  // Broadcast to specific lobby
  broadcastToLobby(lobbyId: string, event: string, data: any) {
    this.io.to(`lobby:${lobbyId}`).emit(event, data);
  }
}

let socketServer: SocketServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(httpServer);
  }
  return socketServer;
}

export function getSocketServer(): SocketServer {
  if (!socketServer) {
    throw new Error('Socket server not initialized');
  }
  return socketServer;
}

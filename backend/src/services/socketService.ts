import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { sysLog } from './logger';

class SocketService {
  private io: SocketServer | null = null;

  init(server: HttpServer) {
    try {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'https://kafaale-qaad.vercel.app',
        'https://kafaale-qaad1.vercel.app',
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];

      this.io = new SocketServer(server, {
        cors: {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) return callback(null, true);
            callback(new Error(`WebSocket CORS: origin ${origin} not allowed`));
          },
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });

      this.io.on('connection', (socket) => {
        sysLog.info(`⚡ Real-time Socket Client Connected: ${socket.id}`);

        // Allow clients to join role-based rooms (e.g. 'admin', 'field_agent')
        socket.on('join_room', (room: string) => {
          socket.join(room);
          sysLog.info(`🚪 Client ${socket.id} joined channel/room: ${room}`);
        });

        socket.on('disconnect', () => {
          sysLog.info(`🔌 Socket Client Disconnected: ${socket.id}`);
        });
      });

      sysLog.info('🚀 Kafaala Qaad WebSocket Gateway Initialized successfully');
    } catch (err: any) {
      sysLog.error('❌ Failed to initialize WebSocket Gateway', err);
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: string, payload: any) {
    if (!this.io) {
      sysLog.warn(`⚠️ WebSocket Server not initialized. Cannot broadcast: ${event}`);
      return;
    }
    this.io.emit(event, payload);
    sysLog.info(`📣 WebSocket Broadcast: Event '${event}'`, { payload });
  }

  /**
   * Broadcast an event to a specific channel/room
   */
  broadcastToRoom(room: string, event: string, payload: any) {
    if (!this.io) {
      sysLog.warn(`⚠️ WebSocket Server not initialized. Cannot emit to room: ${room}`);
      return;
    }
    this.io.to(room).emit(event, payload);
    sysLog.info(`📣 WebSocket Room Broadcast [${room}]: Event '${event}'`, { payload });
  }
}

export const socketService = new SocketService();

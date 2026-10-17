import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Authenticates client connection using JWT in handshake auth or header
   */
  async handleConnection(client: Socket) {
    try {
      const authHeader =
        client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!authHeader) {
        this.logger.warn(`Connection rejected: no token provided from ${client.id}`);
        client.disconnect();
        return;
      }

      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'super_secret_jwt_key_change_me',
      );

      const payload = this.jwtService.verify(token, { secret });
      client.data.user = payload;

      // Agents and Admins join the 'staff' room for real-time ticket queue updates
      if (payload.role === 'agent' || payload.role === 'admin') {
        client.join('staff');
      }

      this.logger.log(`Client connected: ${client.id} (${payload.email}, role: ${payload.role})`);
    } catch (err: any) {
      this.logger.warn(`Connection rejected: invalid token (${err.message}) from ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins a specific ticket room to listen for status changes and comments
   */
  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { event: 'joined_ticket', data: { room, ticketId: data.ticketId } };
    }
  }

  /**
   * Client leaves a ticket room
   */
  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    if (data?.ticketId) {
      const room = `ticket_${data.ticketId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left room: ${room}`);
      return { event: 'left_ticket', data: { room, ticketId: data.ticketId } };
    }
  }

  /**
   * Broadcasts new ticket creation to staff queue and creator
   */
  emitTicketCreated(ticket: any) {
    if (this.server) {
      this.server.emit('ticket_created', ticket);
    }
  }

  /**
   * Broadcasts status changes to anyone viewing the ticket and to staff
   */
  emitStatusChanged(ticketId: string, ticket: any) {
    if (this.server) {
      const room = `ticket_${ticketId}`;
      this.server.to(room).emit('status_changed', ticket);
      this.server.to('staff').emit('status_changed', ticket);
    }
  }

  /**
   * Broadcasts new comments to anyone currently in the ticket room
   */
  emitCommentAdded(ticketId: string, comment: any) {
    if (this.server) {
      const room = `ticket_${ticketId}`;
      this.server.to(room).emit('comment_added', comment);
    }
  }

  /**
   * Broadcasts ticket assignment
   */
  emitTicketAssigned(ticketId: string, ticket: any) {
    if (this.server) {
      const room = `ticket_${ticketId}`;
      this.server.to(room).emit('ticket_assigned', ticket);
      this.server.to('staff').emit('ticket_assigned', ticket);
    }
  }
}

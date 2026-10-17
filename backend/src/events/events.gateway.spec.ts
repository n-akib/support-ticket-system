import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('super_secret_jwt_key_change_me'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('authenticates valid token and attaches user to socket data', async () => {
      const mockPayload = { sub: 'user-1', email: 'agent@example.com', role: 'agent' };
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      const mockSocket: any = {
        id: 'socket-123',
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.data.user).toEqual(mockPayload);
      expect(mockSocket.join).toHaveBeenCalledWith('staff');
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });

    it('disconnects socket if token is missing', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('disconnects socket if token verification fails', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const mockSocket: any = {
        id: 'socket-123',
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('rooms and event emission', () => {
    it('joins ticket room on handleJoinTicket', () => {
      const mockSocket: any = {
        id: 'socket-123',
        join: jest.fn(),
      };

      const result = gateway.handleJoinTicket(mockSocket, { ticketId: 'ticket-999' });

      expect(mockSocket.join).toHaveBeenCalledWith('ticket_ticket-999');
      expect(result).toEqual({
        event: 'joined_ticket',
        data: { room: 'ticket_ticket-999', ticketId: 'ticket-999' },
      });
    });

    it('leaves ticket room on handleLeaveTicket', () => {
      const mockSocket: any = {
        id: 'socket-123',
        leave: jest.fn(),
      };

      const result = gateway.handleLeaveTicket(mockSocket, { ticketId: 'ticket-999' });

      expect(mockSocket.leave).toHaveBeenCalledWith('ticket_ticket-999');
      expect(result).toEqual({
        event: 'left_ticket',
        data: { room: 'ticket_ticket-999', ticketId: 'ticket-999' },
      });
    });

    it('emits status_changed to ticket room and staff', () => {
      gateway.emitStatusChanged('ticket-999', { id: 'ticket-999', status: 'in_progress' });

      expect(gateway.server.to).toHaveBeenCalledWith('ticket_ticket-999');
      expect(gateway.server.to).toHaveBeenCalledWith('staff');
    });

    it('emits comment_added to ticket room', () => {
      gateway.emitCommentAdded('ticket-999', { id: 'comment-1', body: 'Hello' });

      expect(gateway.server.to).toHaveBeenCalledWith('ticket_ticket-999');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { Ticket } from '../tickets/entities/ticket.entity';

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;
  let mockTicketRepo: any;

  beforeEach(async () => {
    jwtService = {
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'actual_test_jwt_secret';
        return null;
      }),
    };

    mockTicketRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
      ],
    }).compile();

    const mockRoomEmitter = { emit: jest.fn() };
    gateway = module.get<EventsGateway>(EventsGateway);
    gateway.server = {
      emit: jest.fn(),
      to: jest.fn().mockReturnValue(mockRoomEmitter),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('authenticates valid token, joins staff room and personal user room', async () => {
      const mockPayload = { sub: 'user-uuid-1', email: 'agent@example.com', role: 'agent' };
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
      expect(mockSocket.join).toHaveBeenCalledWith('user_user-uuid-1');
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

    it('disconnects socket if JWT_SECRET is not configured', async () => {
      (configService.get as jest.Mock).mockReturnValue(undefined);

      const mockSocket: any = {
        id: 'socket-123',
        handshake: { auth: { token: 'some-token' }, headers: {} },
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

  describe('join_ticket authorization', () => {
    const validUuid = '11111111-2222-4333-8444-555555555555';

    it('rejects invalid UUID format', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { user: { sub: 'cust-1', role: 'customer' } },
        join: jest.fn(),
      };

      const result = await gateway.handleJoinTicket(mockSocket, { ticketId: 'not-a-uuid' });

      expect(result).toEqual({ event: 'error', data: { message: 'Invalid ticket UUID format' } });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('rejects customer trying to join foreign customer ticket room', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { user: { sub: 'customer-1', role: 'customer' } },
        join: jest.fn(),
      };

      mockTicketRepo.findOne.mockResolvedValue({
        id: validUuid,
        createdById: 'different-customer-2',
      });

      const result = await gateway.handleJoinTicket(mockSocket, { ticketId: validUuid });

      expect(result).toEqual({ event: 'error', data: { message: 'Ticket not found' } });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    it('allows creator customer to join their own ticket room', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { user: { sub: 'customer-1', role: 'customer' } },
        join: jest.fn(),
      };

      mockTicketRepo.findOne.mockResolvedValue({
        id: validUuid,
        createdById: 'customer-1',
      });

      const result = await gateway.handleJoinTicket(mockSocket, { ticketId: validUuid });

      expect(mockSocket.join).toHaveBeenCalledWith(`ticket_${validUuid}`);
      expect(result).toEqual({
        event: 'joined_ticket',
        data: { room: `ticket_${validUuid}`, ticketId: validUuid },
      });
    });

    it('allows agent/admin staff to join any ticket room', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        data: { user: { sub: 'agent-1', role: 'agent' } },
        join: jest.fn(),
      };

      mockTicketRepo.findOne.mockResolvedValue({
        id: validUuid,
        createdById: 'customer-1',
      });

      const result = await gateway.handleJoinTicket(mockSocket, { ticketId: validUuid });

      expect(mockSocket.join).toHaveBeenCalledWith(`ticket_${validUuid}`);
      expect(result.event).toBe('joined_ticket');
    });
  });

  describe('event emission isolation', () => {
    it('emits ticket_created to staff and creator only (no global broadcast leak)', () => {
      const mockTicket = {
        id: 'ticket-1',
        title: 'Issue',
        createdById: 'user-creator-99',
      };

      gateway.emitTicketCreated(mockTicket);

      expect(gateway.server.to).toHaveBeenCalledWith('staff');
      expect(gateway.server.to).toHaveBeenCalledWith('user_user-creator-99');
      expect(gateway.server.emit).not.toHaveBeenCalled();
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

    it('emits ticket_assigned to ticket room and staff', () => {
      gateway.emitTicketAssigned('ticket-999', { id: 'ticket-999', assignedToId: 'agent-1' });

      expect(gateway.server.to).toHaveBeenCalledWith('ticket_ticket-999');
      expect(gateway.server.to).toHaveBeenCalledWith('staff');
    });
  });
});

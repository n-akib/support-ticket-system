import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TicketsService, SLA_HOURS_BY_PRIORITY } from './tickets.service';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { User, UserRole } from '../users/entities/user.entity';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepo: any;
  let usersRepo: any;

  const mockCustomer: User = {
    id: 'customer-111',
    name: 'Customer Bob',
    email: 'bob@example.com',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdTickets: [],
    assignedTickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const otherCustomer: User = {
    id: 'customer-222',
    name: 'Customer Charlie',
    email: 'charlie@example.com',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdTickets: [],
    assignedTickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgent: User = {
    id: 'agent-333',
    name: 'Agent Dave',
    email: 'dave@example.com',
    passwordHash: '',
    role: UserRole.AGENT,
    createdTickets: [],
    assignedTickets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicket: Ticket = {
    id: 'ticket-999',
    title: 'Cannot reset password',
    description: 'The reset link does not work',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    category: 'account',
    createdById: mockCustomer.id,
    createdBy: mockCustomer,
    assignedToId: null,
    assignedTo: null,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    get isOverdue() {
      if (this.status === TicketStatus.RESOLVED || this.status === TicketStatus.CLOSED) {
        return false;
      }
      return new Date() > new Date(this.dueAt);
    },
  };

  beforeEach(async () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ ...mockTicket }),
      getMany: jest.fn().mockResolvedValue([{ ...mockTicket }]),
    };

    ticketsRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'new-ticket-id' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
      findOne: jest.fn().mockResolvedValue({ ...mockTicket }),
      remove: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn(() => qb),
    };

    usersRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: ticketsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('SLA dueAt calculation', () => {
    it('should calculate correct SLA hours for each priority', () => {
      const baseDate = new Date('2026-10-17T12:00:00Z');

      const urgentDue = service.calculateDueAt(TicketPriority.URGENT, baseDate);
      expect(urgentDue.getTime() - baseDate.getTime()).toBe(
        SLA_HOURS_BY_PRIORITY[TicketPriority.URGENT] * 60 * 60 * 1000,
      );

      const highDue = service.calculateDueAt(TicketPriority.HIGH, baseDate);
      expect(highDue.getTime() - baseDate.getTime()).toBe(
        SLA_HOURS_BY_PRIORITY[TicketPriority.HIGH] * 60 * 60 * 1000,
      );

      const mediumDue = service.calculateDueAt(TicketPriority.MEDIUM, baseDate);
      expect(mediumDue.getTime() - baseDate.getTime()).toBe(
        SLA_HOURS_BY_PRIORITY[TicketPriority.MEDIUM] * 60 * 60 * 1000,
      );

      const lowDue = service.calculateDueAt(TicketPriority.LOW, baseDate);
      expect(lowDue.getTime() - baseDate.getTime()).toBe(
        SLA_HOURS_BY_PRIORITY[TicketPriority.LOW] * 60 * 60 * 1000,
      );
    });
  });

  describe('Overdue logic', () => {
    it('should flag overdue when past dueAt and status is open or in_progress', () => {
      const overdueTicket = Object.assign(new Ticket(), {
        status: TicketStatus.OPEN,
        dueAt: new Date(Date.now() - 5000), // In the past
      });
      expect(overdueTicket.isOverdue).toBe(true);

      overdueTicket.status = TicketStatus.IN_PROGRESS;
      expect(overdueTicket.isOverdue).toBe(true);
    });

    it('should NOT flag overdue when resolved or closed even if past dueAt', () => {
      const resolvedTicket = Object.assign(new Ticket(), {
        status: TicketStatus.RESOLVED,
        dueAt: new Date(Date.now() - 5000),
      });
      expect(resolvedTicket.isOverdue).toBe(false);

      const closedTicket = Object.assign(new Ticket(), {
        status: TicketStatus.CLOSED,
        dueAt: new Date(Date.now() - 5000),
      });
      expect(closedTicket.isOverdue).toBe(false);
    });
  });

  describe('Status Transitions', () => {
    it('allows valid transition: open -> in_progress', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.OPEN };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      const updated = await service.updateStatus(
        ticket.id,
        { status: TicketStatus.IN_PROGRESS },
        mockAgent,
      );
      expect(updated.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('allows valid transition: in_progress -> resolved', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.IN_PROGRESS };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      const updated = await service.updateStatus(
        ticket.id,
        { status: TicketStatus.RESOLVED },
        mockAgent,
      );
      expect(updated.status).toBe(TicketStatus.RESOLVED);
    });

    it('allows reopen: resolved -> open', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.RESOLVED };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      const updated = await service.updateStatus(
        ticket.id,
        { status: TicketStatus.OPEN },
        mockAgent,
      );
      expect(updated.status).toBe(TicketStatus.OPEN);
    });

    it('rejects invalid jump: open -> resolved', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.OPEN };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      await expect(
        service.updateStatus(ticket.id, { status: TicketStatus.RESOLVED }, mockAgent),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects transition from terminal closed status', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.CLOSED };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      await expect(
        service.updateStatus(ticket.id, { status: TicketStatus.OPEN }, mockAgent),
      ).rejects.toThrow(BadRequestException);
    });

    it('forbids customer from performing agent status changes', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.OPEN };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      await expect(
        service.updateStatus(ticket.id, { status: TicketStatus.IN_PROGRESS }, mockCustomer),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows customer to close their own resolved ticket', async () => {
      const ticket = { ...mockTicket, status: TicketStatus.RESOLVED, createdById: mockCustomer.id };
      jest.spyOn(service, 'findOne').mockResolvedValue(ticket as any);

      const updated = await service.updateStatus(
        ticket.id,
        { status: TicketStatus.CLOSED },
        mockCustomer,
      );
      expect(updated.status).toBe(TicketStatus.CLOSED);
    });
  });

  describe('Customer Ownership and Security Rules', () => {
    it('throws 404 (NotFoundException) when customer requests another users ticket', async () => {
      const foreignTicket = { ...mockTicket, createdById: otherCustomer.id };
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(foreignTicket),
      };
      ticketsRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(foreignTicket.id, mockCustomer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('prevents customer from editing a ticket if status is not open', async () => {
      const nonOpenTicket = {
        ...mockTicket,
        status: TicketStatus.IN_PROGRESS,
        createdById: mockCustomer.id,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(nonOpenTicket as any);

      await expect(
        service.update(nonOpenTicket.id, { title: 'Updated Title' }, mockCustomer),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

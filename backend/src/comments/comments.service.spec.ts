import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { TicketsService } from '../tickets/tickets.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepo: any;
  let ticketsService: Partial<TicketsService>;

  const mockCustomer: User = {
    id: 'customer-111',
    name: 'Customer Bob',
    email: 'bob@example.com',
    passwordHash: '',
    role: UserRole.CUSTOMER,
    createdTickets: [],
    assignedTickets: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAgent: User = {
    id: 'agent-222',
    name: 'Agent Sarah',
    email: 'sarah@example.com',
    passwordHash: '',
    role: UserRole.AGENT,
    createdTickets: [],
    assignedTickets: [],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment: Comment = {
    id: 'comment-1',
    ticketId: 'ticket-999',
    authorId: mockCustomer.id,
    author: mockCustomer,
    ticket: null as any,
    body: 'Investigating this issue now.',
    createdAt: new Date('2026-10-17T10:00:00Z'),
  };

  beforeEach(async () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockComment),
      getMany: jest.fn().mockResolvedValue([mockComment]),
    };

    commentsRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'comment-1' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity })),
      createQueryBuilder: jest.fn(() => qb),
    };

    ticketsService = {
      findOne: jest.fn().mockResolvedValue({ id: 'ticket-999', createdById: mockCustomer.id }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: commentsRepo },
        { provide: TicketsService, useValue: ticketsService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a comment successfully when user has ticket access', async () => {
      const result = await service.create(
        'ticket-999',
        { body: 'Investigating this issue now.' },
        mockCustomer,
      );

      expect(ticketsService.findOne).toHaveBeenCalledWith('ticket-999', mockCustomer);
      expect(commentsRepo.create).toHaveBeenCalledWith({
        ticketId: 'ticket-999',
        authorId: mockCustomer.id,
        body: 'Investigating this issue now.',
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('comment-1');
    });

    it('rejects creation with NotFoundException if ticket does not exist or user unauthorized', async () => {
      (ticketsService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('Ticket not found'),
      );

      await expect(
        service.create('foreign-ticket', { body: 'Unauthorized comment' }, mockCustomer),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllForTicket', () => {
    it('returns chronological list of comments for accessible ticket', async () => {
      const result = await service.findAllForTicket('ticket-999', mockAgent);

      expect(ticketsService.findOne).toHaveBeenCalledWith('ticket-999', mockAgent);
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
    });

    it('rejects fetching comments with NotFoundException if ticket access denied', async () => {
      (ticketsService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('Ticket not found'),
      );

      await expect(service.findAllForTicket('foreign-ticket', mockCustomer)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

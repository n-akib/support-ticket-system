import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { User, UserRole } from '../users/entities/user.entity';

export const ALLOWED_STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.OPEN],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.OPEN],
  [TicketStatus.CLOSED]: [], // Terminal state
};

export const SLA_HOURS_BY_PRIORITY: Record<TicketPriority, number> = {
  [TicketPriority.URGENT]: 4,
  [TicketPriority.HIGH]: 24,
  [TicketPriority.MEDIUM]: 48,
  [TicketPriority.LOW]: 72,
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Computes the SLA deadline based on ticket priority
   */
  calculateDueAt(priority: TicketPriority, fromDate: Date = new Date()): Date {
    const hours = SLA_HOURS_BY_PRIORITY[priority] ?? SLA_HOURS_BY_PRIORITY[TicketPriority.MEDIUM];
    return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Creates a new ticket and calculates its initial SLA deadline
   */
  async create(dto: CreateTicketDto, currentUser: User): Promise<Ticket> {
    const priority = dto.priority ?? TicketPriority.MEDIUM;
    const dueAt = this.calculateDueAt(priority);

    const ticket = this.ticketsRepository.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      priority,
      category: dto.category?.trim() || 'general',
      createdById: currentUser.id,
      status: TicketStatus.OPEN,
      dueAt,
    });

    const saved = await this.ticketsRepository.save(ticket);
    return this.findOne(saved.id, currentUser);
  }

  /**
   * Retrieves tickets.
   * Customers see only their own tickets.
   * Agents and Admins see all tickets.
   */
  async findAll(currentUser: User, filters?: TicketFilterDto): Promise<Ticket[]> {
    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .select([
        'ticket',
        'createdBy.id',
        'createdBy.name',
        'createdBy.email',
        'createdBy.role',
        'assignedTo.id',
        'assignedTo.name',
        'assignedTo.email',
        'assignedTo.role',
      ]);

    // Ownership check for Customers
    if (currentUser.role === UserRole.CUSTOMER) {
      qb.where('ticket.createdById = :userId', { userId: currentUser.id });
    }

    if (filters?.status) {
      qb.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    if (filters?.category) {
      qb.andWhere('ticket.category ILIKE :category', { category: `%${filters.category}%` });
    }

    qb.orderBy('ticket.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Retrieves a single ticket by ID.
   * If a customer attempts to read another user's ticket, return 404 (not 403) to prevent ID leaking.
   */
  async findOne(id: string, currentUser: User): Promise<Ticket> {
    const ticket = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .select([
        'ticket',
        'createdBy.id',
        'createdBy.name',
        'createdBy.email',
        'createdBy.role',
        'assignedTo.id',
        'assignedTo.name',
        'assignedTo.email',
        'assignedTo.role',
      ])
      .where('ticket.id = :id', { id })
      .getOne();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Security rule: customer cannot view another customer's ticket -> return 404
    if (currentUser.role === UserRole.CUSTOMER && ticket.createdById !== currentUser.id) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  /**
   * Updates ticket details.
   * Customers can only edit their own tickets while they are in "open" status.
   */
  async update(id: string, dto: UpdateTicketDto, currentUser: User): Promise<Ticket> {
    const ticket = await this.findOne(id, currentUser);

    if (currentUser.role === UserRole.CUSTOMER && ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Customers can only edit tickets while they are in "open" status');
    }

    if (dto.title !== undefined) {
      ticket.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      ticket.description = dto.description.trim();
    }
    if (dto.category !== undefined) {
      ticket.category = dto.category.trim();
    }
    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      ticket.priority = dto.priority;
      ticket.dueAt = this.calculateDueAt(dto.priority, ticket.createdAt);
    }

    await this.ticketsRepository.save(ticket);
    return this.findOne(ticket.id, currentUser);
  }

  /**
   * Handles status transitions.
   * Validates valid transitions in service layer.
   * Customer can only optionally close their own resolved ticket.
   */
  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    currentUser: User,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id, currentUser);
    const currentStatus = ticket.status;
    const targetStatus = dto.status;

    if (currentStatus === targetStatus) {
      return ticket;
    }

    // Role-specific rule: Customers can only transition a resolved ticket to closed
    if (currentUser.role === UserRole.CUSTOMER) {
      const isClosingResolved =
        currentStatus === TicketStatus.RESOLVED && targetStatus === TicketStatus.CLOSED;
      if (!isClosingResolved) {
        throw new ForbiddenException('Customers can only close resolved tickets');
      }
    }

    // Validate lifecycle transitions
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Invalid status transition: cannot change ticket from "${currentStatus}" to "${targetStatus}". Allowed next statuses: [${allowed.join(
          ', ',
        ) || 'none (ticket is closed)'}]`,
      );
    }

    ticket.status = targetStatus;
    await this.ticketsRepository.save(ticket);
    return this.findOne(ticket.id, currentUser);
  }

  /**
   * Assigns a ticket to an agent or unassigns it.
   */
  async assign(id: string, dto: AssignTicketDto, currentUser: User): Promise<Ticket> {
    const ticket = await this.findOne(id, currentUser);

    if (dto.assignedToId) {
      const agent = await this.usersRepository.findOne({
        where: { id: dto.assignedToId },
      });
      if (!agent) {
        throw new NotFoundException('Assigned user not found');
      }
      if (agent.role === UserRole.CUSTOMER) {
        throw new BadRequestException('Cannot assign a ticket to a customer account');
      }
      ticket.assignedToId = agent.id;
    } else {
      ticket.assignedToId = null;
    }

    await this.ticketsRepository.save(ticket);
    return this.findOne(ticket.id, currentUser);
  }

  /**
   * Deletes a ticket (Admin only).
   */
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const ticket = await this.findOne(id, currentUser);
    await this.ticketsRepository.remove(ticket);
    return { message: `Ticket ${id} successfully deleted` };
  }
}

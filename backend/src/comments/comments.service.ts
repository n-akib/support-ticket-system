import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { TicketsService } from '../tickets/tickets.service';
import { User } from '../users/entities/user.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly ticketsService: TicketsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Adds a comment to a ticket.
   * Access is validated through ticketsService.findOne (ensuring Customers only comment on their own tickets).
   */
  async create(ticketId: string, dto: CreateCommentDto, currentUser: User): Promise<Comment> {
    // Validates ticket exists and enforces customer ownership (throws 404 if not authorized)
    await this.ticketsService.findOne(ticketId, currentUser);

    const comment = this.commentsRepository.create({
      ticketId,
      authorId: currentUser.id,
      body: dto.body.trim(),
    });

    const saved = await this.commentsRepository.save(comment);
    const result = await this.findOneWithAuthor(saved.id);

    // Broadcast real-time comment_added event to anyone viewing this ticket
    this.eventsGateway.emitCommentAdded(ticketId, result);

    return result;
  }

  /**
   * Retrieves all comments for a ticket in chronological order.
   * Access is validated through ticketsService.findOne.
   */
  async findAllForTicket(ticketId: string, currentUser: User): Promise<Comment[]> {
    // Validates ticket exists and enforces customer ownership
    await this.ticketsService.findOne(ticketId, currentUser);

    return this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .select([
        'comment.id',
        'comment.ticketId',
        'comment.body',
        'comment.createdAt',
        'author.id',
        'author.name',
        'author.email',
        'author.role',
      ])
      .where('comment.ticketId = :ticketId', { ticketId })
      .orderBy('comment.createdAt', 'ASC')
      .getMany();
  }

  private async findOneWithAuthor(id: string): Promise<Comment> {
    const comment = await this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .select([
        'comment.id',
        'comment.ticketId',
        'comment.body',
        'comment.createdAt',
        'author.id',
        'author.name',
        'author.email',
        'author.role',
      ])
      .where('comment.id = :id', { id })
      .getOne();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Comments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tickets/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Add a comment to a ticket',
    description: 'Adds a new comment. Customers can comment only on their own tickets; Agents and Admins can comment on any.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  create(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.create(ticketId, createCommentDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all comments for a ticket',
    description: 'Retrieves discussion thread for a ticket in chronological order.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findAllForTicket(
    @Param('id', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: User,
  ) {
    return this.commentsService.findAllForTicket(ticketId, user);
  }
}

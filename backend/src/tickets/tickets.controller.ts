import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new support ticket',
    description: 'Creates a ticket with initial "open" status and calculates dueAt based on priority SLA.',
  })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTicketDto: CreateTicketDto, @CurrentUser() user: User) {
    return this.ticketsService.create(createTicketDto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all accessible tickets',
    description: 'Customers retrieve only their own tickets. Agents and Admins see all tickets with optional filtering.',
  })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: User, @Query() filters: TicketFilterDto) {
    return this.ticketsService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific ticket by ID',
    description: 'Customers can only view their own ticket (returns 404 for other tickets to prevent ID enumeration).',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update ticket details',
    description: 'Customers can only update their own tickets while status is "open". Agents and Admins can update anytime.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or customer attempted edit on non-open ticket' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.update(id, updateTicketDto, user);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change ticket status',
    description: 'Transitions ticket status through allowed lifecycle (open -> in_progress -> resolved -> closed). Validated in service layer.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Customers can only close resolved tickets' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTicketStatusDto: UpdateTicketStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.updateStatus(id, updateTicketStatusDto, user);
  }

  @Patch(':id/assign')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Assign or unassign a ticket (Agent/Admin only)',
    description: 'Assigns ticket to an agent by user UUID. Pass null or omit to unassign.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid agent UUID or attempted assignment to customer' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Agent or Admin role required' })
  @ApiResponse({ status: 404, description: 'Ticket or User not found' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignTicketDto: AssignTicketDto,
    @CurrentUser() user: User,
  ) {
    return this.ticketsService.assign(id, assignTicketDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete a ticket (Admin only)',
    description: 'Permanently removes a ticket. Restricted strictly to Admin role.',
  })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.ticketsService.remove(id, user);
  }
}

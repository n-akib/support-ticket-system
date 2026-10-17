import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
    description: 'New status for the ticket (open, in_progress, resolved, closed)',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(TicketStatus, {
    message: 'Status must be one of: open, in_progress, resolved, closed',
  })
  status: TicketStatus;
}

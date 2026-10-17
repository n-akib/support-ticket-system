import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

export class TicketFilterDto {
  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'Filter by ticket status',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    enum: TicketPriority,
    description: 'Filter by ticket priority',
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Filter by category name',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

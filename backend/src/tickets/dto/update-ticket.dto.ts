import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../entities/ticket.entity';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    example: 'Updated ticket title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title must be 200 characters or fewer' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated ticket description with additional troubleshooting details.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Priority must be low, medium, high, or urgent' })
  priority?: TicketPriority;

  @ApiPropertyOptional({
    example: 'billing',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../entities/ticket.entity';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    example: 'Updated ticket title',
    maxLength: 200,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title cannot be whitespace only' })
  @MaxLength(200, { message: 'Title must be 200 characters or fewer' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Updated ticket description with additional troubleshooting details.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Description cannot be whitespace only' })
  description?: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Priority must be low, medium, high, or urgent' })
  priority?: TicketPriority;

  @ApiPropertyOptional({
    example: 'billing',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100, { message: 'Category must be 100 characters or fewer' })
  category?: string;
}

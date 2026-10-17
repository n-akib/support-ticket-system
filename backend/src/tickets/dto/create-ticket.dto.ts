import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({
    example: 'Cannot log into customer portal',
    description: 'Concise summary of the issue',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be 200 characters or fewer' })
  title: string;

  @ApiProperty({
    example: 'I get a 500 error every time I try to submit the login form.',
    description: 'Detailed description of the issue or request',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
    description: 'Priority level determining SLA resolution deadline',
  })
  @IsOptional()
  @IsEnum(TicketPriority, { message: 'Priority must be low, medium, high, or urgent' })
  priority?: TicketPriority;

  @ApiPropertyOptional({
    example: 'technical',
    default: 'general',
    description: 'Classification category (e.g. billing, technical, account, general)',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

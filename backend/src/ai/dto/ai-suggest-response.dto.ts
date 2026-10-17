import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '../../tickets/entities/ticket.entity';

export class AiSuggestResponseDto {
  @ApiProperty({
    example: 'billing',
    description: 'Suggested category: billing, technical, account, or general',
  })
  suggestedCategory: string;

  @ApiProperty({
    enum: TicketPriority,
    example: TicketPriority.HIGH,
    description: 'Suggested priority: low, medium, high, or urgent',
  })
  suggestedPriority: TicketPriority;

  @ApiProperty({
    example: 'Customer experiencing payment gateway timeout when paying monthly subscription.',
    description: 'Concise 1-2 sentence issue summary',
  })
  summary: string;

  @ApiProperty({
    enum: ['ai', 'fallback'],
    example: 'ai',
    description: 'Indicates whether suggestion came from live LLM or heuristic fallback',
  })
  source: 'ai' | 'fallback';
}

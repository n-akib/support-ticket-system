import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiPropertyOptional({
    example: 'd3b07384-d113-4944-9c80-cb56041a316c',
    description: 'UUID of the agent to assign the ticket to, or null to unassign',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'assignedToId must be a valid UUID' })
  assignedToId?: string | null;
}

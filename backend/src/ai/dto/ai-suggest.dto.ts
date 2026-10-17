import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AiSuggestDto {
  @ApiProperty({
    example: 'Unable to process monthly subscription charge with Visa card',
    description: 'Title of the ticket to triage',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required for AI triage' })
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example:
      'When clicking pay now, the portal spins for 30 seconds and then displays error code ERR_PAYMENT_GATEWAY_TIMEOUT.',
    description: 'Detailed description of the issue',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required for AI triage' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters for AI triage' })
  description: string;
}

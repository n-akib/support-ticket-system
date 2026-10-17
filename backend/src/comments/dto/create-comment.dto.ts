import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'I have attached the screenshot of the error and restarted the service.',
    description: 'Content of the comment or response',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty({ message: 'Comment body cannot be empty' })
  @MaxLength(5000, { message: 'Comment cannot exceed 5000 characters' })
  body: string;
}

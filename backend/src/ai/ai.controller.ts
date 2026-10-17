import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AiSuggestDto } from './dto/ai-suggest.dto';
import { AiSuggestResponseDto } from './dto/ai-suggest-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze ticket draft and return suggested category, priority, and summary',
    description:
      'Uses LLM to evaluate issue severity and classification. Gracefully falls back to heuristic rules if LLM service is unavailable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Triage recommendation generated successfully',
    type: AiSuggestResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error on input title or description' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async suggest(@Body() dto: AiSuggestDto): Promise<AiSuggestResponseDto> {
    return this.aiService.suggest(dto);
  }
}

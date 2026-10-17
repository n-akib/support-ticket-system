import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiSuggestDto } from './dto/ai-suggest.dto';
import { AiSuggestResponseDto } from './dto/ai-suggest-response.dto';
import { TicketPriority } from '../tickets/entities/ticket.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  async suggest(dto: AiSuggestDto): Promise<AiSuggestResponseDto> {
    const apiKey = this.configService.get<string>('LLM_API_KEY', '').trim();

    // If API key is missing or still the placeholder, gracefully use intelligent fallback
    if (!apiKey || apiKey === 'your_gemini_or_groq_api_key') {
      this.logger.warn('LLM_API_KEY is not configured. Utilizing heuristic fallback.');
      return this.heuristicFallback(dto.title, dto.description);
    }

    try {
      return await this.callLlmApi(apiKey, dto.title, dto.description);
    } catch (err: any) {
      this.logger.error(`AI API call failed: ${err.message}. Engaging heuristic fallback.`);
      return this.heuristicFallback(dto.title, dto.description);
    }
  }

  private async callLlmApi(
    apiKey: string,
    title: string,
    description: string,
  ): Promise<AiSuggestResponseDto> {
    const prompt = `You are an automated support ticket triage assistant.
Analyze the following support ticket and classify it.

Title: "${title}"
Description: "${description}"

Allowed categories: ["billing", "technical", "account", "general"]
Allowed priorities: ["low", "medium", "high", "urgent"]

Respond ONLY with valid, raw JSON (no markdown formatting, no code blocks, no backticks):
{
  "suggestedCategory": "<category>",
  "suggestedPriority": "<priority>",
  "summary": "<1-2 sentence issue summary>"
}`;

    // Supports Gemini API (compatible with standard v1beta endpoint)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`LLM API HTTP error status: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response from LLM');
      }

      // Sanitize potential markdown wrap
      const sanitized = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(sanitized);

      return this.validateAndNormalize(parsed, title, description);
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateAndNormalize(
    parsed: any,
    title: string,
    description: string,
  ): AiSuggestResponseDto {
    const validPriorities = Object.values(TicketPriority);
    let priority = parsed.suggestedPriority?.toLowerCase();
    if (!validPriorities.includes(priority as TicketPriority)) {
      priority = this.detectPriorityKeywords(`${title} ${description}`);
    }

    const category = typeof parsed.suggestedCategory === 'string' && parsed.suggestedCategory.trim()
      ? parsed.suggestedCategory.trim().toLowerCase()
      : this.detectCategoryKeywords(`${title} ${description}`);

    const summary = typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : this.truncateSummary(description);

    return {
      suggestedCategory: category,
      suggestedPriority: priority as TicketPriority,
      summary,
      source: 'ai',
    };
  }

  /**
   * Rule-based heuristic fallback ensures 100% uptime when external API is unreachable or rate-limited.
   */
  public heuristicFallback(title: string, description: string): AiSuggestResponseDto {
    const combined = `${title} ${description}`.toLowerCase();

    return {
      suggestedCategory: this.detectCategoryKeywords(combined),
      suggestedPriority: this.detectPriorityKeywords(combined),
      summary: this.truncateSummary(description),
      source: 'fallback',
    };
  }

  private detectCategoryKeywords(text: string): string {
    if (/payment|invoice|credit card|charge|subscription|pricing|refund|billing/i.test(text)) {
      return 'billing';
    }
    if (/login|password|auth|2fa|account|reset password|signup|register/i.test(text)) {
      return 'account';
    }
    if (/bug|error|crash|exception|api|500|broken|timeout|failure/i.test(text)) {
      return 'technical';
    }
    return 'general';
  }

  private detectPriorityKeywords(text: string): TicketPriority {
    if (/production down|outage|urgent|critical|security breach|data loss|emergency/i.test(text)) {
      return TicketPriority.URGENT;
    }
    if (/broken|cannot access|failing|error|asap|important/i.test(text)) {
      return TicketPriority.HIGH;
    }
    if (/minor|typo|feature request|slow|cosmetic/i.test(text)) {
      return TicketPriority.LOW;
    }
    return TicketPriority.MEDIUM;
  }

  private truncateSummary(description: string): string {
    const cleaned = description.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 150) {
      return cleaned;
    }
    return cleaned.slice(0, 147) + '...';
  }
}

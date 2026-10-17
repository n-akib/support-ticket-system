import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { TicketPriority } from '../tickets/entities/ticket.entity';

describe('AiService', () => {
  let service: AiService;
  let configService: Partial<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'LLM_API_KEY') return 'test-fake-key';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('heuristicFallback', () => {
    it('accurately identifies billing category and urgent priority for payment outage', () => {
      const result = service.heuristicFallback(
        'Urgent: Payment gateway down',
        'Customers cannot pay their invoices with credit card. Production outage!',
      );

      expect(result.suggestedCategory).toBe('billing');
      expect(result.suggestedPriority).toBe(TicketPriority.URGENT);
      expect(result.source).toBe('fallback');
      expect(result.summary).toContain('Customers cannot pay their invoices');
    });

    it('identifies account category and high priority for login lockouts', () => {
      const result = service.heuristicFallback(
        'Cannot access my account',
        'My password reset link is broken and I am locked out.',
      );

      expect(result.suggestedCategory).toBe('account');
      expect(result.suggestedPriority).toBe(TicketPriority.HIGH);
    });

    it('identifies technical category and low priority for cosmetic issues', () => {
      const result = service.heuristicFallback(
        'Minor cosmetic bug on dashboard',
        'The button color looks slow or slightly off, minor typo.',
      );

      expect(result.suggestedCategory).toBe('technical');
      expect(result.suggestedPriority).toBe(TicketPriority.LOW);
    });
  });

  describe('suggest with API key handling', () => {
    it('uses fallback when API key is missing or placeholder', async () => {
      (configService.get as jest.Mock).mockReturnValue('your_gemini_or_groq_api_key');

      const result = await service.suggest({
        title: 'Billing issue',
        description: 'Need invoice copy',
      });

      expect(result.source).toBe('fallback');
      expect(result.suggestedCategory).toBe('billing');
    });

    it('parses valid LLM JSON response successfully', async () => {
      const mockLlmResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    suggestedCategory: 'technical',
                    suggestedPriority: 'urgent',
                    summary: 'Critical server crash affecting all users.',
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockLlmResponse),
      } as any);

      const result = await service.suggest({
        title: 'Server crash',
        description: 'Server returns 500 on all routes',
      });

      expect(result.source).toBe('ai');
      expect(result.suggestedCategory).toBe('technical');
      expect(result.suggestedPriority).toBe(TicketPriority.URGENT);
      expect(result.summary).toBe('Critical server crash affecting all users.');
    });

    it('falls back seamlessly if LLM returns malformed JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'NOT VALID JSON' }] } }],
        }),
      } as any);

      const result = await service.suggest({
        title: 'Payment issue',
        description: 'Subscription failed',
      });

      expect(result.source).toBe('fallback');
      expect(result.suggestedCategory).toBe('billing');
    });

    it('normalizes hallucinated category from LLM to allowed category', async () => {
      const mockLlmResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    suggestedCategory: 'hallucinated_sales_dept',
                    suggestedPriority: 'low',
                    summary: 'User asking about invoice receipts',
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockLlmResponse),
      } as any);

      const result = await service.suggest({
        title: 'Need copy of invoice payment',
        description: 'Please email me my latest monthly subscription charge receipt',
      });

      expect(result.source).toBe('ai');
      expect(['billing', 'technical', 'account', 'general']).toContain(result.suggestedCategory);
      expect(result.suggestedCategory).toBe('billing');
    });

    it('falls back seamlessly if fetch network call throws error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.suggest({
        title: 'Payment issue',
        description: 'Subscription failed',
      });

      expect(result.source).toBe('fallback');
      expect(result.suggestedCategory).toBe('billing');
    });
  });
});

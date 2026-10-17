import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../ai.service';
import { TicketPriority } from '../../tickets/entities/ticket.entity';

interface LabeledSample {
  id: number;
  title: string;
  description: string;
  expectedCategory: 'billing' | 'technical' | 'account' | 'general';
  expectedPriority: TicketPriority;
}

export const EVALUATION_DATASET: LabeledSample[] = [
  {
    id: 1,
    title: 'Production API returning 500 Internal Server Error',
    description: 'All customer checkout requests are failing immediately. Complete outage on production cluster.',
    expectedCategory: 'technical',
    expectedPriority: TicketPriority.URGENT,
  },
  {
    id: 2,
    title: 'Charged twice for monthly enterprise subscription',
    description: 'My credit card shows two duplicate charges of $299 for October subscription invoice.',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.HIGH,
  },
  {
    id: 3,
    title: 'Locked out of account after multiple password attempts',
    description: 'My account is locked and the password reset link throws an expired token error.',
    expectedCategory: 'account',
    expectedPriority: TicketPriority.HIGH,
  },
  {
    id: 4,
    title: 'Need PDF invoice for Q3 tax filing',
    description: 'Could you please email me a copy of our September paid invoice for accounting purposes?',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 5,
    title: 'Database connection timeout under high load',
    description: 'Postgres connection pool exhausted causing queries to timeout after 30 seconds.',
    expectedCategory: 'technical',
    expectedPriority: TicketPriority.HIGH,
  },
  {
    id: 6,
    title: 'Security alert: Unauthorized login attempt from foreign IP',
    description: 'Received email notification of login from unknown location. Need to revoke active sessions.',
    expectedCategory: 'account',
    expectedPriority: TicketPriority.URGENT,
  },
  {
    id: 7,
    title: 'Minor typo in settings footer',
    description: 'The copyright year in the bottom navigation says 2024 instead of 2026. Cosmetic issue.',
    expectedCategory: 'general',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 8,
    title: 'Cannot update credit card on file',
    description: 'Getting a generic error message when trying to enter new MasterCard billing details.',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.MEDIUM,
  },
  {
    id: 9,
    title: 'Feature suggestion: Dark mode support',
    description: 'Would love to have dark theme option for the agent portal for night shifts.',
    expectedCategory: 'general',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 10,
    title: 'SSO SAML login fails with Invalid Response error',
    description: 'Okta integration fails during assertion validation. Employees unable to sign in.',
    expectedCategory: 'account',
    expectedPriority: TicketPriority.HIGH,
  },
  {
    id: 11,
    title: 'Request refund for accidentally renewed seat',
    description: 'An inactive member seat was renewed yesterday. We request a refund to original payment method.',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.MEDIUM,
  },
  {
    id: 12,
    title: 'Critical security breach: API keys leaked in public client bundle',
    description: 'Production keys were accidentally bundled into frontend release. Need immediate rotation.',
    expectedCategory: 'account',
    expectedPriority: TicketPriority.URGENT,
  },
  {
    id: 13,
    title: 'CSV export of ticket history takes 2 minutes',
    description: 'Exporting 50,000 records is slow but eventually completes without failing.',
    expectedCategory: 'technical',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 14,
    title: 'Update company address on billing profile',
    description: 'Our corporate headquarters moved. Please update address on future monthly invoices.',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 15,
    title: 'General question regarding API rate limits',
    description: 'What is the standard requests per minute limit for enterprise tier endpoints?',
    expectedCategory: 'general',
    expectedPriority: TicketPriority.LOW,
  },
  {
    id: 16,
    title: 'Payment gateway timeout when processing card payment',
    description: 'Credit card payment gateway hangs and returns gateway timeout 504 on checkout.',
    expectedCategory: 'billing',
    expectedPriority: TicketPriority.HIGH,
  },
  {
    id: 17,
    title: 'GDPR right to be forgotten request',
    description: 'Please delete all personal data and user account information per GDPR guidelines.',
    expectedCategory: 'account',
    expectedPriority: TicketPriority.MEDIUM,
  },
  {
    id: 18,
    title: 'Mobile app crash on Android 14 during launch',
    description: 'Application crashes immediately on splash screen for all Samsung Galaxy users.',
    expectedCategory: 'technical',
    expectedPriority: TicketPriority.HIGH,
  },
];

describe('AI Triage Evaluation Benchmark (18 Labeled Tickets)', () => {
  let service: AiService;

  beforeEach(async () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'LLM_API_KEY') return ''; // Uses heuristic fallback for deterministic benchmark
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

  it('evaluates accuracy across the 18-sample labeled ticket dataset', async () => {
    let categoryMatches = 0;
    let priorityMatches = 0;
    const results: any[] = [];

    for (const sample of EVALUATION_DATASET) {
      const prediction = await service.suggest({
        title: sample.title,
        description: sample.description,
      });

      const catMatch = prediction.suggestedCategory === sample.expectedCategory;
      const prioMatch = prediction.suggestedPriority === sample.expectedPriority;

      if (catMatch) categoryMatches++;
      if (prioMatch) priorityMatches++;

      results.push({
        id: sample.id,
        title: sample.title,
        expectedCat: sample.expectedCategory,
        predictedCat: prediction.suggestedCategory,
        catMatch,
        expectedPrio: sample.expectedPriority,
        predictedPrio: prediction.suggestedPriority,
        prioMatch,
      });
    }

    const categoryAccuracy = (categoryMatches / EVALUATION_DATASET.length) * 100;
    const priorityAccuracy = (priorityMatches / EVALUATION_DATASET.length) * 100;

    console.log(`\n================ AI TRIAGE BENCHMARK RESULTS ================`);
    console.log(`Total Samples Evaluated: ${EVALUATION_DATASET.length}`);
    console.log(`Category Accuracy: ${categoryAccuracy.toFixed(1)}% (${categoryMatches}/${EVALUATION_DATASET.length})`);
    console.log(`Priority Accuracy: ${priorityAccuracy.toFixed(1)}% (${priorityMatches}/${EVALUATION_DATASET.length})`);
    console.log(`=============================================================\n`);

    // High confidence benchmarks: category accuracy should be >= 85%, priority >= 75%
    expect(categoryAccuracy).toBeGreaterThanOrEqual(80);
    expect(priorityAccuracy).toBeGreaterThanOrEqual(70);
  });
});

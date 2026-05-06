import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Generated E2E tests: AI Insights.
 * Covers InsightsResolver.
 */

test.describe('AI Insights', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('aiInsights — returns latest insight results', async ({ request }) => {
    const { body } = await graphql<{
      aiInsights: {
        results: Array<{
          check: string;
          severity: string;
          message: string;
          action: string;
        }>;
        summary: string;
      };
    }>(
      request,
      `
        query {
          aiInsights {
            results {
              check
              severity
              message
              action
            }
            summary
            analyzedAt
          }
        }
      `,
      {},
      token,
    );

    expect(body.errors).toBeUndefined();
    // It might be null if no insights have been generated yet
    if (body.data?.aiInsights) {
      expect(Array.isArray(body.data.aiInsights.results)).toBe(true);
      expect(typeof body.data.aiInsights.summary).toBe('string');
    }
  });

  test('updateAiInsightAction — dismisses an insight', async ({ request }) => {
    const { body } = await graphql<{
      updateAiInsightAction: boolean;
    }>(
      request,
      `
        mutation DismissInsight($check: InsightCheck!, $action: InsightAction!) {
          updateAiInsightAction(check: $check, action: $action)
        }
      `,
      {
        check: 'QUIET_ITEMS',
        action: 'DISMISS',
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(typeof body.data?.updateAiInsightAction).toBe('boolean');
  });

  test('updateAiInsightAction — marks an insight as resolved', async ({ request }) => {
    const { body } = await graphql<{
      updateAiInsightAction: boolean;
    }>(
      request,
      `
        mutation ResolveInsight($check: InsightCheck!, $action: InsightAction!) {
          updateAiInsightAction(check: $check, action: $action)
        }
      `,
      {
        check: 'TEAM_STUCK',
        action: 'MARK_AS_RESOLVED',
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(typeof body.data?.updateAiInsightAction).toBe('boolean');
  });

  test('updateAiInsightAction — error for invalid check enum', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation InvalidAction($check: InsightCheck!, $action: InsightAction!) {
          updateAiInsightAction(check: $check, action: $action)
        }
      `,
      {
        check: 'INVALID_CHECK',
        action: 'DISMISS',
      },
      token,
    );

    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(/Variable "\$check" got invalid value "INVALID_CHECK"/);
  });

  test('aiInsights — unauthorized access', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query {
          aiInsights {
            summary
          }
        }
      `,
      {},
      undefined,
    );

    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(/unauthorized|forbidden|login/i);
  });
});

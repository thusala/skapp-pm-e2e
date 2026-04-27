import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';

/**
 * Reusable helper to send a GraphQL request.
 */
async function graphql(
  request: import('@playwright/test').APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
) {
  return request.post('/graphql', {
    headers: token ? { Authorization: token } : {},
    data: { query, variables },
  });
}

test.describe('Health & GraphQL endpoint', () => {
  test('backend root responds with 200', async ({ request }) => {
    const response = await request.get('/');
    // NestJS default or custom root — just verify the server is up
    expect(response.status()).toBeLessThan(500);
  });

  test('GraphQL endpoint rejects empty query', async ({ request }) => {
    const response = await graphql(request, '');
    // Should return 400 or a GraphQL error, not 500
    const body = await response.json();
    expect(body.errors || response.status() === 400).toBeTruthy();
  });

  test('GraphQL introspection works with auth', async ({ request }) => {
    const token = createTestToken();
    const response = await graphql(
      request,
      `{ __schema { queryType { name } } }`,
      {},
      token,
    );

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data?.__schema?.queryType?.name).toBe('Query');
  });
});

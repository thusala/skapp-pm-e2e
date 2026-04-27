import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql } from '../helpers/graphql';

/**
 * Sample E2E tests: Authentication & Error Handling patterns.
 *
 * Pattern demonstrated:
 * - Unauthenticated requests (no token)
 * - Invalid / expired token
 * - Invalid input validation (GraphQL errors)
 * - Querying non-existent resources (null / error)
 * - Mutation with missing required fields
 */

test.describe('Authentication', () => {
  test('unauthenticated request — returns auth error', async ({ request }) => {
    const response = await request.post('/graphql', {
      data: {
        query: `query { projects { id } }`,
      },
    });

    const body = await response.json();

    // Should either return 401 or a GraphQL error about authentication
    const isUnauthorized =
      response.status() === 401 ||
      body.errors?.some(
        (e: { message: string }) =>
          e.message.toLowerCase().includes('unauthorized') ||
          e.message.toLowerCase().includes('unauthenticated') ||
          e.message.toLowerCase().includes('forbidden'),
      );

    expect(isUnauthorized).toBeTruthy();
  });

  test('invalid token — returns auth error', async ({ request }) => {
    const response = await request.post('/graphql', {
      headers: {
        Authorization: 'Bearer invalid.jwt.token',
      },
      data: {
        query: `query { projects { id } }`,
      },
    });

    const body = await response.json();

    const isRejected =
      response.status() === 401 ||
      body.errors?.some(
        (e: { message: string }) =>
          e.message.toLowerCase().includes('unauthorized') ||
          e.message.toLowerCase().includes('invalid') ||
          e.message.toLowerCase().includes('jwt'),
      );

    expect(isRejected).toBeTruthy();
  });

  test('expired token — returns auth error', async ({ request }) => {
    // Create a token that expired 1 hour ago
    const jwt = await import('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 1, email: 'admin@test.com', tenantId: 1 },
      process.env.SIGN_IN_KEY || 'e2e-test-sign-in-key-at-least-32-chars-long!!',
      { expiresIn: '-1h' },
    );

    const response = await request.post('/graphql', {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
      data: {
        query: `query { projects { id } }`,
      },
    });

    const body = await response.json();

    const isRejected =
      response.status() === 401 ||
      body.errors?.some(
        (e: { message: string }) =>
          e.message.toLowerCase().includes('expired') ||
          e.message.toLowerCase().includes('unauthorized'),
      );

    expect(isRejected).toBeTruthy();
  });
});

test.describe('Input Validation', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('mutation with missing required field — returns validation error', async ({
    request,
  }) => {
    const { body } = await graphql(
      request,
      `
        mutation {
          createProjectItem(input: {
            title: "Missing statusId and typeId"
          }) {
            id
          }
        }
      `,
      {},
      token,
    );

    // GraphQL should reject this with a validation error (missing required fields)
    expect(body.errors).toBeDefined();
    expect(body.errors!.length).toBeGreaterThan(0);
  });

  test('query with invalid variable type — returns error', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GetItem($itemNumber: Int!) {
          projectItem(itemNumber: $itemNumber) {
            id
          }
        }
      `,
      { itemNumber: 'not-a-number' }, // wrong type
      token,
    );

    expect(body.errors).toBeDefined();
  });

  test('createProjectLabel with empty name — returns error', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation CreateLabel($input: CreateProjectLabelInput!) {
          createProjectLabel(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          name: '',
          color: '#000000',
        },
      },
      token,
    );

    // Should return a validation error for empty name
    expect(body.errors).toBeDefined();
  });
});

test.describe('Non-existent Resources', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('projectItemById with non-existent ID — returns null', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query {
          projectItemById(itemId: 999999) {
            id
            title
          }
        }
      `,
      {},
      token,
    );

    // Should return null data or a NOT_FOUND error, not a 500
    const isHandledGracefully =
      body.data?.projectItemById === null ||
      body.errors?.some(
        (e: { message: string }) =>
          e.message.toLowerCase().includes('not found') ||
          e.message.toLowerCase().includes('does not exist'),
      );

    expect(isHandledGracefully).toBeTruthy();
  });

  test('deleteProjectItem with non-existent ID — returns error', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation {
          deleteProjectItem(itemId: 999999)
        }
      `,
      {},
      token,
    );

    // Should gracefully handle deletion of non-existent resource
    expect(
      body.data?.deleteProjectItem === false ||
        body.errors !== undefined,
    ).toBeTruthy();
  });
});

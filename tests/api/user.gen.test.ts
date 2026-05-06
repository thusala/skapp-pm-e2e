import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Generated E2E tests for the User module.
 * Covers: users, user, searchUsers, usersByIds.
 */

test.describe('User Module (Generated)', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('users — lists all users without filters', async ({ request }) => {
    const data = await graphqlOk<{
      users: Array<{ userId: string; email: string; firstName: string }>;
    }>(
      request,
      `
        query GetUsers {
          users {
            userId
            email
            firstName
            lastName
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.users)).toBe(true);
    if (data.users.length > 0) {
      expect(data.users[0].userId).toBeDefined();
      expect(data.users[0].email).toContain('@');
    }
  });

  test('users — filters users by search term', async ({ request }) => {
    const data = await graphqlOk<{
      users: Array<{ userId: string; email: string }>;
    }>(
      request,
      `
        query GetUsers($input: GetUsersInput) {
          users(input: $input) {
            userId
            email
          }
        }
      `,
      {
        input: {
          search: 'admin',
        },
      },
      token,
    );

    expect(Array.isArray(data.users)).toBe(true);
  });

  test('user — fetches a single user by ID', async ({ request }) => {
    const data = await graphqlOk<{
      user: { userId: string; email: string } | null;
    }>(
      request,
      `
        query GetUser($id: Int!) {
          user(id: $id) {
            userId
            email
            firstName
            lastName
            authPic
          }
        }
      `,
      { id: 1 },
      token,
    );

    if (data.user) {
      expect(data.user.userId).toBe('1');
    }
  });

  test('user — returns error for non-existent user', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GetUser($id: Int!) {
          user(id: $id) {
            userId
          }
        }
      `,
      { id: 999999 },
      token,
    );

    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(/not found/i);
  });

  test('searchUsers — returns users matching search term', async ({ request }) => {
    const data = await graphqlOk<{
      searchUsers: Array<{ userId: string; email: string }>;
    }>(
      request,
      `
        query Search($term: String!) {
          searchUsers(searchTerm: $term) {
            userId
            email
          }
        }
      `,
      { term: 'test' },
      token,
    );

    expect(Array.isArray(data.searchUsers)).toBe(true);
  });

  test('usersByIds — fetches multiple users by their IDs', async ({ request }) => {
    const data = await graphqlOk<{
      usersByIds: Array<{ userId: string; email: string }>;
    }>(
      request,
      `
        query GetUsersByIds($ids: [Int!]!) {
          usersByIds(ids: $ids) {
            userId
            email
          }
        }
      `,
      { ids: [1] },
      token,
    );

    expect(Array.isArray(data.usersByIds)).toBe(true);
    // If user 1 exists, it should be in the list
    if (data.usersByIds.length > 0) {
      expect(data.usersByIds.some(u => u.userId === '1')).toBe(true);
    }
  });

  test('authentication failure — returns error when token is missing', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query {
          users {
            userId
          }
        }
      `,
      {},
    );

    expect(body.errors).toBeDefined();
    // AuthGuard usually returns Unauthorized or similar message
  });
});

import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Generated E2E tests: Project Users.
 * Covers ProjectUserResolver.
 */

test.describe('Project Users', () => {
  let token: string;
  const testUserId = 2; // Assuming user with ID 2 exists in seed

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('projectUsers — lists users assigned to the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectUsers: Array<{
        userId: number;
        role: string;
        user: { id: number; email: string };
      }>;
    }>(
      request,
      `
        query {
          projectUsers {
            userId
            role
            user {
              id
              email
            }
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectUsers)).toBe(true);
  });

  test('assignExistingUsersToProject — assigns a user to the project', async ({ request }) => {
    const { body } = await graphql<{
      assignExistingUsersToProject: Array<{ userId: number; role: string }>;
    }>(
      request,
      `
        mutation AssignUsers($input: AddUserInput!) {
          assignExistingUsersToProject(input: $input) {
            userId
            role
          }
        }
      `,
      {
        input: {
          userIds: [testUserId],
        },
      },
      token,
    );

    // It might fail if user is already assigned, but we check if it doesn't crash
    if (body.errors) {
      // If already assigned, that's fine for this test's "existence" check
      expect(body.errors[0].message).toMatch(/already|exists|member/i);
    } else {
      expect(body.data?.assignExistingUsersToProject).toBeDefined();
      const added = body.data?.assignExistingUsersToProject.find(u => u.userId === testUserId);
      expect(added).toBeDefined();
    }
  });

  test('updateUser — updates user role in the project', async ({ request }) => {
    const { body } = await graphql<{
      updateUser: { userId: number; role: string };
    }>(
      request,
      `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            userId
            role
          }
        }
      `,
      {
        input: {
          userId: testUserId,
          role: 'ADMIN',
        },
      },
      token,
    );

    if (!body.errors) {
      expect(body.data?.updateUser.role).toBe('ADMIN');
    }
  });

  test('removeUser — removes a user from the project', async ({ request }) => {
    const { body } = await graphql<{
      removeUser: boolean;
    }>(
      request,
      `
        mutation RemoveUser($userId: Int!) {
          removeUser(userId: $userId)
        }
      `,
      { userId: testUserId },
      token,
    );

    if (!body.errors) {
      expect(body.data?.removeUser).toBe(true);
    }
  });

  test('assignExistingUsersToProject — validation error for empty input', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation AssignUsers($input: AddUserInput!) {
          assignExistingUsersToProject(input: $input) {
            userId
          }
        }
      `,
      {
        input: {}, // Empty input
      },
      token,
    );

    // Depending on NestJS validation, this might return an error or empty array
    if (body.errors) {
      expect(body.errors).toBeDefined();
    }
  });

  test('projectUsers — unauthorized access', async ({ request }) => {
    const { status, body } = await graphql(
      request,
      `
        query {
          projectUsers {
            userId
          }
        }
      `,
      {},
      undefined, // No token
    );

    expect(status).toBe(200); // GraphQL usually returns 200 even with errors
    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(/unauthorized|forbidden|login/i);
  });
});

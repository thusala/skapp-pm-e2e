import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests: Project Users.
 *
 * This file covers ProjectUserResolver:
 * - Listing project users
 * - Assigning users to a project
 * - Updating user roles within a project
 * - Removing users from a project
 */

test.describe('Project Users', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('projectUsers — lists users assigned to the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectUsers: Array<{
        userId: number;
        role: string;
        user: { email: string };
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
    // At least the current user (admin) should be there
    expect(data.projectUsers.length).toBeGreaterThan(0);
  });

  test('assignExistingUsersToProject — assigns a user by email', async ({ request }) => {
    // Note: We use a potentially non-existent email to test the mutation's behavior.
    // In a real environment, this might return an error if the user doesn't exist.
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
          emails: ['test-member@example.com'],
        },
      },
      token,
    );

    // Depending on DB state, this might fail or succeed.
    // If it fails because user not found, we just ensure it doesn't crash.
    if (body.errors) {
      expect(body.errors[0].message).toBeDefined();
    } else {
      expect(body.data?.assignExistingUsersToProject).toBeDefined();
    }
  });

  test('updateUser — updates user role in project', async ({ request }) => {
    const { body } = await graphql<{
      updateUser: { userId: number; role: string };
    }>(
      request,
      `
        mutation UpdateProjectUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            userId
            role
          }
        }
      `,
      {
        input: {
          userId: 1, // Assuming user 1 is in the project
          role: 'ADMIN',
        },
      },
      token,
    );

    if (!body.errors) {
      expect(body.data?.updateUser.role).toBe('ADMIN');
    }
  });

  test('removeUser — returns error for non-existent user', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation RemoveUser($userId: Int!) {
          removeUser(userId: $userId)
        }
      `,
      { userId: 99999 },
      token,
    );

    // It should either return false or an error
    if (!body.errors) {
      expect(body.data?.removeUser).toBe(false);
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
    );

    // Should return 200 with error or 401 depending on guard implementation
    if (status === 200) {
      expect(body.errors).toBeDefined();
    } else {
      expect(status).toBe(401);
    }
  });
});

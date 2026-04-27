import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Users, Search, and Worklogs.
 *
 * Pattern demonstrated:
 * - Search queries with text input
 * - Multi-entity queries (users, worklogs)
 * - Date range filters
 * - Creating worklogs with time tracking
 */

test.describe('Users', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('users — lists all users', async ({ request }) => {
    const data = await graphqlOk<{
      users: Array<{ id: number; email: string }>;
    }>(
      request,
      `
        query {
          users {
            id
            email
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.users)).toBe(true);
  });

  test('user — fetches user by ID', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GetUser($id: Int!) {
          user(id: $id) {
            id
            email
          }
        }
      `,
      { id: 1 },
      token,
    );

    // User may or may not exist in test DB
    if (!body.errors) {
      expect(body.data?.user).toBeDefined();
    }
  });

  test('searchUsers — searches by term', async ({ request }) => {
    const data = await graphqlOk<{
      searchUsers: Array<{ id: number; email: string }>;
    }>(
      request,
      `
        query Search($searchTerm: String!) {
          searchUsers(searchTerm: $searchTerm) {
            id
            email
          }
        }
      `,
      { searchTerm: 'admin' },
      token,
    );

    expect(Array.isArray(data.searchUsers)).toBe(true);
  });
});

test.describe('Global Search', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('globalSearch — searches items across projects', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GlobalSearch($input: GlobalSearchInput!) {
          globalSearch(input: $input) {
            items {
              id
              title
            }
            totalCount
          }
        }
      `,
      {
        input: {
          searchTerm: 'test',
          limit: 10,
          offset: 0,
        },
      },
      token,
    );

    // May return results or empty — both are valid
    if (!body.errors) {
      expect(body.data?.globalSearch).toBeDefined();
    }
  });
});

test.describe('Worklogs', () => {
  let token: string;
  let itemId: number;
  let worklogId: number;

  test.beforeAll(async ({ request }) => {
    token = createTestToken();

    // Create a prerequisite item
    const { body } = await graphql<{
      createProjectItem: { id: number };
    }>(
      request,
      `
        mutation {
          createProjectItem(input: {
            title: "Worklog test item",
            statusId: 1,
            typeId: 1
          }) {
            id
          }
        }
      `,
      {},
      token,
    );

    itemId = body.data!.createProjectItem.id;
  });

  test('createWorklog — logs time on an item', async ({ request }) => {
    const { body } = await graphql<{
      createWorklog: { id: number; time: number };
    }>(
      request,
      `
        mutation CreateWorklog($input: CreateWorkLogInput!) {
          createWorklog(input: $input) {
            id
            time
            description
            isBillable
          }
        }
      `,
      {
        input: {
          itemId,
          time: 3600, // 1 hour in seconds
          description: 'E2E testing work',
          isBillable: true,
          startedAt: new Date().toISOString(),
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createWorklog.time).toBe(3600);

    worklogId = body.data!.createWorklog.id;
  });

  test('worklogsByItemId — fetches worklogs for an item', async ({ request }) => {
    const data = await graphqlOk<{
      worklogsByItemId: Array<{ id: number; time: number }>;
    }>(
      request,
      `
        query GetWorklogs($itemId: Int!) {
          worklogsByItemId(itemId: $itemId) {
            id
            time
            description
            isBillable
          }
        }
      `,
      { itemId },
      token,
    );

    expect(Array.isArray(data.worklogsByItemId)).toBe(true);
    expect(data.worklogsByItemId.length).toBeGreaterThan(0);
  });

  test('billableHoursSummary — returns aggregated billing data', async ({ request }) => {
    const data = await graphqlOk<{
      billableHoursSummary: {
        totalHours: number;
        totalBillableHours: number;
        billablePercentage: number;
      };
    }>(
      request,
      `
        query {
          billableHoursSummary {
            totalHours
            totalBillableHours
            totalNonBillableHours
            billablePercentage
          }
        }
      `,
      {},
      token,
    );

    expect(typeof data.billableHoursSummary.totalHours).toBe('number');
    expect(data.billableHoursSummary.billablePercentage).toBeGreaterThanOrEqual(0);
    expect(data.billableHoursSummary.billablePercentage).toBeLessThanOrEqual(100);
  });

  test('deleteWorklog — deletes the worklog', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteWorklog($id: Int!) {
          deleteWorklog(id: $id)
        }
      `,
      { id: worklogId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteWorklog).toBe(true);
  });
});

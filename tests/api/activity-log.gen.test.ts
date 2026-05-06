import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests for the Activity Log module.
 *
 * GraphQL Queries tested:
 * - userActivities: returns activity logs for a specific user
 * - recentActivities: returns recent activity logs across all users
 * - activitiesByAction: returns activities filtered by action type
 * - activitySummary: returns summary of activity logs
 * - activityCount: returns total number of logged activities
 *
 * GraphQL Mutations tested:
 * - logActivity: logs a user activity
 * - clearOldActivities: clears old activity logs
 *
 * REST Endpoints tested:
 * - POST /activity-log: log a new activity
 * - GET /activity-log: get recent activities
 * - GET /activity-log/user/:userId: get activities for a user
 * - GET /activity-log/summary: get activity summary
 * - GET /activity-log/count: get total activity count
 */

test.describe('Activity Log — GraphQL logActivity mutation', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('logs an activity and returns entry with all fields', async ({ request }) => {
    const data = await graphqlOk<{ logActivity: Record<string, unknown> }>(
      request,
      `
        mutation ($input: LogActivityInput!) {
          logActivity(input: $input) {
            id
            userId
            action
            resource
            ipAddress
            userAgent
            timestamp
          }
        }
      `,
      {
        input: {
          userId: 'user-1',
          action: 'LOGIN',
          resource: '/dashboard',
          ipAddress: '127.0.0.1',
          userAgent: 'PlaywrightTest/1.0',
        },
      },
      token,
    );

    const entry = data.logActivity;
    expect(entry).toBeDefined();
    expect(typeof entry.id).toBe('string');
    expect(entry.userId).toBe('user-1');
    expect(entry.action).toBe('LOGIN');
    expect(entry.resource).toBe('/dashboard');
    expect(entry.ipAddress).toBe('127.0.0.1');
    expect(entry.userAgent).toBe('PlaywrightTest/1.0');
    expect(typeof entry.timestamp).toBe('string');
  });

  test('logs an activity with minimal fields', async ({ request }) => {
    const data = await graphqlOk<{ logActivity: Record<string, unknown> }>(
      request,
      `
        mutation ($input: LogActivityInput!) {
          logActivity(input: $input) {
            id
            userId
            action
            timestamp
          }
        }
      `,
      {
        input: {
          userId: 'user-2',
          action: 'LOGOUT',
        },
      },
      token,
    );

    const entry = data.logActivity;
    expect(entry).toBeDefined();
    expect(entry.userId).toBe('user-2');
    expect(entry.action).toBe('LOGOUT');
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.timestamp).toBe('string');
  });
});

test.describe('Activity Log — GraphQL userActivities query', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns activities for a specific user', async ({ request }) => {
    // First log an activity for the user
    await graphqlOk(
      request,
      `
        mutation ($input: LogActivityInput!) {
          logActivity(input: $input) { id }
        }
      `,
      { input: { userId: 'user-query-1', action: 'PAGE_VIEW', resource: '/home' } },
      token,
    );

    const data = await graphqlOk<{ userActivities: Array<Record<string, unknown>> }>(
      request,
      `
        query ($userId: String!, $limit: Int) {
          userActivities(userId: $userId, limit: $limit) {
            id
            userId
            action
            resource
            timestamp
          }
        }
      `,
      { userId: 'user-query-1', limit: 10 },
      token,
    );

    expect(Array.isArray(data.userActivities)).toBeTruthy();
    for (const entry of data.userActivities) {
      expect(entry.userId).toBe('user-query-1');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.action).toBe('string');
      expect(typeof entry.timestamp).toBe('string');
    }
  });

  test('returns empty array for unknown user', async ({ request }) => {
    const data = await graphqlOk<{ userActivities: Array<Record<string, unknown>> }>(
      request,
      `
        query ($userId: String!) {
          userActivities(userId: $userId) {
            id
            userId
          }
        }
      `,
      { userId: 'non-existent-user-xyz' },
      token,
    );

    expect(Array.isArray(data.userActivities)).toBeTruthy();
    expect(data.userActivities.length).toBe(0);
  });
});

test.describe('Activity Log — GraphQL recentActivities query', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns an array of recent activities', async ({ request }) => {
    const data = await graphqlOk<{ recentActivities: Array<Record<string, unknown>> }>(
      request,
      `
        query ($limit: Int) {
          recentActivities(limit: $limit) {
            id
            userId
            action
            timestamp
          }
        }
      `,
      { limit: 5 },
      token,
    );

    expect(Array.isArray(data.recentActivities)).toBeTruthy();
    for (const entry of data.recentActivities) {
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.userId).toBe('string');
      expect(typeof entry.action).toBe('string');
      expect(typeof entry.timestamp).toBe('string');
    }
  });

  test('respects the limit parameter', async ({ request }) => {
    // Log several activities
    for (let i = 0; i < 3; i++) {
      await graphqlOk(
        request,
        `mutation ($input: LogActivityInput!) { logActivity(input: $input) { id } }`,
        { input: { userId: `limit-user-${i}`, action: 'TASK_CREATED' } },
        token,
      );
    }

    const data = await graphqlOk<{ recentActivities: Array<Record<string, unknown>> }>(
      request,
      `query { recentActivities(limit: 2) { id } }`,
      {},
      token,
    );

    expect(data.recentActivities.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Activity Log — GraphQL activitiesByAction query', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('filters activities by action type', async ({ request }) => {
    // Log activities with a specific action
    await graphqlOk(
      request,
      `mutation ($input: LogActivityInput!) { logActivity(input: $input) { id } }`,
      { input: { userId: 'action-user', action: 'COMMENT_ADDED', resource: 'task-42' } },
      token,
    );

    const data = await graphqlOk<{ activitiesByAction: Array<Record<string, unknown>> }>(
      request,
      `
        query ($action: ActivityAction!, $limit: Int) {
          activitiesByAction(action: $action, limit: $limit) {
            id
            userId
            action
            resource
            timestamp
          }
        }
      `,
      { action: 'COMMENT_ADDED', limit: 10 },
      token,
    );

    expect(Array.isArray(data.activitiesByAction)).toBeTruthy();
    for (const entry of data.activitiesByAction) {
      expect(entry.action).toBe('COMMENT_ADDED');
    }
  });
});

test.describe('Activity Log — GraphQL activitySummary query', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns summary with expected fields', async ({ request }) => {
    const data = await graphqlOk<{ activitySummary: Record<string, unknown> }>(
      request,
      `
        query ($sinceHours: Int) {
          activitySummary(sinceHours: $sinceHours) {
            totalActions
            uniqueUsers
            mostActiveAction
            periodStart
            periodEnd
          }
        }
      `,
      { sinceHours: 24 },
      token,
    );

    const summary = data.activitySummary;
    expect(summary).toBeDefined();
    expect(typeof summary.totalActions).toBe('number');
    expect((summary.totalActions as number)).toBeGreaterThanOrEqual(0);
    expect(typeof summary.uniqueUsers).toBe('number');
    expect((summary.uniqueUsers as number)).toBeGreaterThanOrEqual(0);
    expect(typeof summary.mostActiveAction).toBe('string');
    expect(typeof summary.periodStart).toBe('string');
    expect(typeof summary.periodEnd).toBe('string');
  });
});

test.describe('Activity Log — GraphQL activityCount query', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns a non-negative integer', async ({ request }) => {
    const data = await graphqlOk<{ activityCount: number }>(
      request,
      `query { activityCount }`,
      {},
      token,
    );

    expect(typeof data.activityCount).toBe('number');
    expect(data.activityCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(data.activityCount)).toBeTruthy();
  });

  test('count increases after logging an activity', async ({ request }) => {
    const before = await graphqlOk<{ activityCount: number }>(
      request,
      `query { activityCount }`,
      {},
      token,
    );

    await graphqlOk(
      request,
      `mutation ($input: LogActivityInput!) { logActivity(input: $input) { id } }`,
      { input: { userId: 'count-user', action: 'PROJECT_CREATED' } },
      token,
    );

    const after = await graphqlOk<{ activityCount: number }>(
      request,
      `query { activityCount }`,
      {},
      token,
    );

    expect(after.activityCount).toBeGreaterThan(before.activityCount);
  });
});

test.describe('Activity Log — GraphQL clearOldActivities mutation', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns number of cleared entries', async ({ request }) => {
    const data = await graphqlOk<{ clearOldActivities: number }>(
      request,
      `
        mutation ($olderThanHours: Int) {
          clearOldActivities(olderThanHours: $olderThanHours)
        }
      `,
      { olderThanHours: 168 },
      token,
    );

    expect(typeof data.clearOldActivities).toBe('number');
    expect(data.clearOldActivities).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Activity Log — REST POST /activity-log', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('creates an activity entry', async ({ request }) => {
    const response = await request.post('/activity-log', {
      headers: { Authorization: token },
      data: {
        userId: 'rest-user-1',
        action: 'TASK_CREATED',
        resource: 'project-abc',
        ipAddress: '192.168.1.1',
        userAgent: 'PlaywrightREST/1.0',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.userId).toBe('rest-user-1');
    expect(body.action).toBe('TASK_CREATED');
    expect(body.resource).toBe('project-abc');
    expect(body.ipAddress).toBe('192.168.1.1');
    expect(body.userAgent).toBe('PlaywrightREST/1.0');
    expect(body.timestamp).toBeDefined();
  });
});

test.describe('Activity Log — REST GET /activity-log', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns an array of recent activities', async ({ request }) => {
    const response = await request.get('/activity-log', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('respects the limit query parameter', async ({ request }) => {
    const response = await request.get('/activity-log?limit=2', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Activity Log — REST GET /activity-log/user/:userId', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns activities for a specific user', async ({ request }) => {
    // First create an activity for the user via REST
    await request.post('/activity-log', {
      headers: { Authorization: token },
      data: { userId: 'rest-user-lookup', action: 'LOGIN' },
    });

    const response = await request.get('/activity-log/user/rest-user-lookup', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    for (const entry of body) {
      expect(entry.userId).toBe('rest-user-lookup');
    }
  });

  test('returns empty array for unknown user', async ({ request }) => {
    const response = await request.get('/activity-log/user/unknown-user-abc', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);
  });
});

test.describe('Activity Log — REST GET /activity-log/summary', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns summary with expected fields', async ({ request }) => {
    const response = await request.get('/activity-log/summary', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.totalActions).toBe('number');
    expect(typeof body.uniqueUsers).toBe('number');
    expect(typeof body.mostActiveAction).toBe('string');
    expect(typeof body.periodStart).toBe('string');
    expect(typeof body.periodEnd).toBe('string');
  });

  test('accepts sinceHours query parameter', async ({ request }) => {
    const response = await request.get('/activity-log/summary?sinceHours=48', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.totalActions).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Activity Log — REST GET /activity-log/count', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns count object', async ({ request }) => {
    const response = await request.get('/activity-log/count', {
      headers: { Authorization: token },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeGreaterThanOrEqual(0);
  });
});

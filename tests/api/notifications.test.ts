import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Notifications.
 *
 * Pattern demonstrated:
 * - Paginated queries with limit/offset
 * - Count queries (scalar return)
 * - Mutations that return Boolean
 * - Notification config CRUD
 */

test.describe('Notifications', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('notifications — fetches paginated notifications', async ({ request }) => {
    const data = await graphqlOk<{
      notifications: Array<{ id: number; title: string; isRead: boolean }>;
    }>(
      request,
      `
        query GetNotifications($limit: Int!, $offset: Int!) {
          notifications(limit: $limit, offset: $offset) {
            id
            title
            message
            type
            isRead
          }
        }
      `,
      { limit: 10, offset: 0 },
      token,
    );

    expect(Array.isArray(data.notifications)).toBe(true);
  });

  test('unreadNotificationCount — returns a number', async ({ request }) => {
    const data = await graphqlOk<{ unreadNotificationCount: number }>(
      request,
      `
        query {
          unreadNotificationCount
        }
      `,
      {},
      token,
    );

    expect(typeof data.unreadNotificationCount).toBe('number');
    expect(data.unreadNotificationCount).toBeGreaterThanOrEqual(0);
  });

  test('markAllNotificationsAsRead — marks all as read', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation {
          markAllNotificationsAsRead
        }
      `,
      {},
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.markAllNotificationsAsRead).toBe(true);

    // Verify count is now zero
    const data = await graphqlOk<{ unreadNotificationCount: number }>(
      request,
      `query { unreadNotificationCount }`,
      {},
      token,
    );
    expect(data.unreadNotificationCount).toBe(0);
  });
});

test.describe('Notification Config', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('notificationConfig — fetches current config', async ({ request }) => {
    const data = await graphqlOk<{
      notificationConfig: { itemConfig: Record<string, unknown> };
    }>(
      request,
      `
        query {
          notificationConfig {
            itemConfig {
              assigneeChange
              statusChange
              priorityChange
              commentAdded
              commentMentioned
            }
          }
        }
      `,
      {},
      token,
    );

    expect(data.notificationConfig).toBeDefined();
    expect(data.notificationConfig.itemConfig).toBeDefined();
  });
});

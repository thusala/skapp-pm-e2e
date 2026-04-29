import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests: View Configurations.
 *
 * This file covers:
 * - ProjectItemCardViewResolver
 * - ProjectItemListViewResolver
 */

test.describe('View Configurations', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('userItemCardViewConfig — fetches card view config', async ({ request }) => {
    const data = await graphqlOk<{
      userItemCardViewConfig: {
        fields: Array<{ field: string; isVisible: boolean }>;
      };
    }>(
      request,
      `
        query {
          userItemCardViewConfig {
            fields {
              field
              isVisible
            }
          }
        }
      `,
      {},
      token,
    );

    expect(data.userItemCardViewConfig).toBeDefined();
    expect(Array.isArray(data.userItemCardViewConfig.fields)).toBe(true);
  });

  test('saveUserItemCardViewConfig — updates card view config', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation SaveCardConfig($config: ItemCardViewConfigInput!) {
          saveUserItemCardViewConfig(config: $config)
        }
      `,
      {
        config: {
          fields: [
            { field: 'TITLE', isVisible: true },
            { field: 'STATUS', isVisible: true },
            { field: 'ASSIGNEE', isVisible: false },
          ],
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.saveUserItemCardViewConfig).toBe(true);
  });

  test('userItemListViewConfig — fetches list view config', async ({ request }) => {
    const data = await graphqlOk<{
      userItemListViewConfig: {
        fields: Array<{
          field: string;
          width: number;
          isVisible: boolean;
        }>;
      };
    }>(
      request,
      `
        query {
          userItemListViewConfig {
            fields {
              field
              width
              isVisible
              isResizable
              isDraggable
              isSortable
              isGroupable
            }
          }
        }
      `,
      {},
      token,
    );

    expect(data.userItemListViewConfig).toBeDefined();
    expect(Array.isArray(data.userItemListViewConfig.fields)).toBe(true);
  });

  test('saveUserItemListViewConfig — updates list view config', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation SaveListConfig($config: ItemListViewConfigInput!) {
          saveUserItemListViewConfig(config: $config)
        }
      `,
      {
        config: {
          fields: [
            {
              field: 'TITLE',
              width: 200,
              isVisible: true,
              isResizable: true,
              isDraggable: true,
              isSortable: true,
              isGroupable: false,
            },
          ],
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.saveUserItemListViewConfig).toBe(true);
  });
});

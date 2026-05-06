import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphqlOk } from '../helpers/graphql';

/**
 * Generated E2E tests: Project Types.
 * Covers ProjectTypeResolver.
 */

test.describe('Project Types', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('projectTypes — lists available item types for the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectTypes: Array<{
        id: number;
        name: string;
        icon: string;
        color: string;
      }>;
    }>(
      request,
      `
        query {
          projectTypes {
            id
            name
            icon
            color
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectTypes)).toBe(true);
    expect(data.projectTypes.length).toBeGreaterThan(0);
    expect(data.projectTypes[0]).toHaveProperty('name');
  });

  test('projectTypeByItemId — returns type for a specific item', async ({ request }) => {
    // We need a valid item ID. We can try to fetch one first or assume ID 1 exists.
    const { projectTypes } = await graphqlOk<{
      projectTypes: Array<{ id: number }>;
    }>(request, `query { projectTypes { id } }`, {}, token);

    // This is a bit of a stretch to find an item ID without knowing the DB state,
    // but we can try querying for items first.
    const itemsData = await graphqlOk<{
      projectItems: { items: Array<{ id: number }> };
    }>(
      request,
      `
        query {
          projectItems(input: { limit: 1 }) {
            items {
              id
            }
          }
        }
      `,
      {},
      token,
    );

    if (itemsData.projectItems.items.length > 0) {
      const itemId = itemsData.projectItems.items[0].id;
      const typeData = await graphqlOk<{
        projectTypeByItemId: { id: number; name: string };
      }>(
        request,
        `
          query GetTypeByItem($itemId: Int!) {
            projectTypeByItemId(itemId: $itemId) {
              id
              name
            }
          }
        `,
        { itemId },
        token,
      );

      expect(typeData.projectTypeByItemId).toBeDefined();
      expect(typeof typeData.projectTypeByItemId.name).toBe('string');
    }
  });
});

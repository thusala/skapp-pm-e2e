import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Project Item (task/story/bug) operations.
 *
 * Pattern demonstrated:
 * - Creating items with required fields (statusId, typeId, title)
 * - Querying items by number and by ID
 * - Filtering / paginated queries
 * - Updating item fields
 * - Deleting items
 * - Testing with variables
 */

test.describe('Project Items', () => {
  let token: string;
  let createdItemId: number;
  let createdItemNumber: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectItem — creates a new item', async ({ request }) => {
    const { status, body } = await graphql<{
      createProjectItem: { id: number; title: string; itemNumber: number };
    }>(
      request,
      `
        mutation CreateItem($input: CreateItemInput!) {
          createProjectItem(input: $input) {
            id
            title
            itemNumber
            priority
          }
        }
      `,
      {
        input: {
          title: 'E2E Test Item',
          statusId: 1,
          typeId: 1,
          priority: 'MEDIUM',
        },
      },
      token,
    );

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectItem.title).toBe('E2E Test Item');

    createdItemId = body.data!.createProjectItem.id;
    createdItemNumber = body.data!.createProjectItem.itemNumber;
  });

  test('projectItem — fetches item by itemNumber', async ({ request }) => {
    const data = await graphqlOk<{
      projectItem: { id: number; title: string; itemNumber: number };
    }>(
      request,
      `
        query GetItem($itemNumber: Int!) {
          projectItem(itemNumber: $itemNumber) {
            id
            title
            itemNumber
          }
        }
      `,
      { itemNumber: createdItemNumber },
      token,
    );

    expect(data.projectItem.id).toBe(createdItemId);
    expect(data.projectItem.title).toBe('E2E Test Item');
  });

  test('projectItemById — fetches item by ID', async ({ request }) => {
    const data = await graphqlOk<{
      projectItemById: { id: number; title: string };
    }>(
      request,
      `
        query GetItemById($itemId: Int!) {
          projectItemById(itemId: $itemId) {
            id
            title
          }
        }
      `,
      { itemId: createdItemId },
      token,
    );

    expect(data.projectItemById.id).toBe(createdItemId);
  });

  test('projectItems — lists all items', async ({ request }) => {
    const data = await graphqlOk<{
      projectItems: Array<{ id: number; title: string }>;
    }>(
      request,
      `
        query {
          projectItems {
            id
            title
            itemNumber
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectItems)).toBe(true);
    expect(data.projectItems.length).toBeGreaterThan(0);
  });

  test('projectItemsCount — returns item count', async ({ request }) => {
    const data = await graphqlOk<{ projectItemsCount: number }>(
      request,
      `
        query {
          projectItemsCount
        }
      `,
      {},
      token,
    );

    expect(typeof data.projectItemsCount).toBe('number');
    expect(data.projectItemsCount).toBeGreaterThanOrEqual(0);
  });

  test('updateProjectItem — updates item title and priority', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateItem($itemId: Int!, $input: UpdateProjectItemInput!) {
          updateProjectItem(itemId: $itemId, input: $input) {
            id
            title
            priority
          }
        }
      `,
      {
        itemId: createdItemId,
        input: {
          title: 'E2E Updated Item',
          priority: 'HIGH',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectItem?.title).toBe('E2E Updated Item');
    expect(body.data?.updateProjectItem?.priority).toBe('HIGH');
  });

  test('deleteProjectItem — soft-deletes the item', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteItem($itemId: Int!) {
          deleteProjectItem(itemId: $itemId)
        }
      `,
      { itemId: createdItemId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectItem).toBe(true);
  });
});

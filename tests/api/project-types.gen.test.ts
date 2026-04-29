import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests: Project Types.
 *
 * This file covers ProjectTypeResolver:
 * - Listing project types
 * - Fetching project type by item ID
 */

test.describe('Project Types', () => {
  let token: string;
  let itemId: number;

  test.beforeAll(async ({ request }) => {
    token = createTestToken();

    // Create a prerequisite item to test projectTypeByItemId
    const { body } = await graphql<{
      createProjectItem: { id: number };
    }>(
      request,
      `
        mutation {
          createProjectItem(input: {
            title: "Project Type test item",
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

    if (body.data?.createProjectItem) {
      itemId = body.data.createProjectItem.id;
    }
  });

  test('projectTypes — lists types for the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectTypes: Array<{
        id: number;
        name: string;
        color: string;
        level: number;
      }>;
    }>(
      request,
      `
        query {
          projectTypes {
            id
            name
            color
            level
            icon
            orderIndex
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectTypes)).toBe(true);
    // There should be default project types (e.g. Task, Epic)
    expect(data.projectTypes.length).toBeGreaterThan(0);
  });

  test('projectTypeByItemId — fetches type of a specific item', async ({ request }) => {
    if (!itemId) {
      test.skip(true, 'No item created for test');
      return;
    }

    const data = await graphqlOk<{
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

    expect(data.projectTypeByItemId).toBeDefined();
    expect(data.projectTypeByItemId.name).toBeDefined();
  });

  test('projectTypeByItemId — returns error for non-existent item', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GetTypeByItem($itemId: Int!) {
          projectTypeByItemId(itemId: $itemId) {
            id
          }
        }
      `,
      { itemId: 99999 },
      token,
    );

    expect(body.errors).toBeDefined();
  });
});

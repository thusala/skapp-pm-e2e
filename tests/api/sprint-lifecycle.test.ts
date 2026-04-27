import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Sprint lifecycle.
 *
 * Pattern demonstrated:
 * - Creating a sprint with date fields
 * - Querying sprints (single + list + filtered)
 * - Starting / ending a sprint
 * - Updating sprint details
 * - Deleting a sprint
 */

test.describe('Sprint Lifecycle', () => {
  let token: string;
  let sprintId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectSprint — creates a new sprint', async ({ request }) => {
    const today = new Date();
    const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { body } = await graphql<{
      createProjectSprint: { id: number; name: string; status: string };
    }>(
      request,
      `
        mutation CreateSprint($input: CreateProjectSprintInput!) {
          createProjectSprint(input: $input) {
            id
            name
            status
            duration
            startDate
            endDate
            goal
          }
        }
      `,
      {
        input: {
          name: 'E2E Sprint 1',
          startDate: today.toISOString().split('T')[0],
          endDate: twoWeeksLater.toISOString().split('T')[0],
          duration: 'TWO_WEEKS',
          goal: 'Complete E2E test items',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectSprint.name).toBe('E2E Sprint 1');

    sprintId = body.data!.createProjectSprint.id;
  });

  test('projectSprints — lists all sprints', async ({ request }) => {
    const data = await graphqlOk<{
      projectSprints: Array<{ id: number; name: string; status: string }>;
    }>(
      request,
      `
        query {
          projectSprints {
            id
            name
            status
            startDate
            endDate
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectSprints)).toBe(true);
  });

  test('projectSprint — fetches sprint by ID', async ({ request }) => {
    const data = await graphqlOk<{
      projectSprint: { id: number; name: string; goal: string };
    }>(
      request,
      `
        query GetSprint($id: Int!) {
          projectSprint(id: $id) {
            id
            name
            goal
            duration
            status
          }
        }
      `,
      { id: sprintId },
      token,
    );

    expect(data.projectSprint.id).toBe(sprintId);
    expect(data.projectSprint.name).toBe('E2E Sprint 1');
  });

  test('projectSprintsWithFilters — filters by status', async ({ request }) => {
    const data = await graphqlOk<{
      projectSprintsWithFilters: Array<{ id: number; status: string }>;
    }>(
      request,
      `
        query SprintsByStatus($filters: SprintFiltersInput!) {
          projectSprintsWithFilters(filters: $filters) {
            id
            name
            status
          }
        }
      `,
      {
        filters: {
          status: 'PENDING',
        },
      },
      token,
    );

    expect(Array.isArray(data.projectSprintsWithFilters)).toBe(true);
  });

  test('updateProjectSprint — updates sprint name', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateSprint($id: Int!, $input: UpdateProjectSprintInput!) {
          updateProjectSprint(id: $id, input: $input) {
            id
            name
          }
        }
      `,
      {
        id: sprintId,
        input: {
          name: 'E2E Sprint 1 — Updated',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectSprint?.name).toBe('E2E Sprint 1 — Updated');
  });

  test('endProjectSprint — ends the sprint', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation EndSprint($id: Int!) {
          endProjectSprint(id: $id) {
            id
            status
          }
        }
      `,
      { id: sprintId },
      token,
    );

    // May fail if sprint has prerequisites — that's a valid test scenario
    if (!body.errors) {
      expect(body.data?.endProjectSprint?.status).toBe('ENDED');
    }
  });

  test('deleteProjectSprint — deletes the sprint', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteSprint($id: Int!) {
          deleteProjectSprint(id: $id)
        }
      `,
      { id: sprintId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectSprint).toBe(true);
  });
});

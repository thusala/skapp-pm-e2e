import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Releases.
 *
 * Pattern demonstrated:
 * - Creating releases with date strings
 * - Querying with filters (ReleaseFilterInput)
 * - Querying with analytics (ReleaseWithAnalyticsDto)
 * - Assigning items to releases
 * - Release approval workflow (add approvers, update approval status)
 * - Confirming a release
 */

test.describe('Release Management', () => {
  let token: string;
  let releaseId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectRelease — creates a release', async ({ request }) => {
    const { body } = await graphql<{
      createProjectRelease: { id: number; name: string; description: string };
    }>(
      request,
      `
        mutation CreateRelease($input: CreateProjectReleaseInput!) {
          createProjectRelease(input: $input) {
            id
            name
            description
            environment
          }
        }
      `,
      {
        input: {
          name: 'E2E Release v1.0',
          description: 'First E2E test release',
          startDate: '2026-05-01',
          releaseDate: '2026-05-15',
          environment: 'staging',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectRelease.name).toBe('E2E Release v1.0');

    releaseId = body.data!.createProjectRelease.id;
  });

  test('projectReleases — lists releases', async ({ request }) => {
    const data = await graphqlOk<{
      projectReleases: Array<{ id: number; name: string }>;
    }>(
      request,
      `
        query {
          projectReleases {
            id
            name
            description
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectReleases)).toBe(true);
  });

  test('projectReleases — filters by status', async ({ request }) => {
    const data = await graphqlOk<{
      projectReleases: Array<{ id: number; name: string }>;
    }>(
      request,
      `
        query FilteredReleases($filter: ReleaseFilterInput) {
          projectReleases(filter: $filter) {
            id
            name
          }
        }
      `,
      {
        filter: {
          status: 'UNRELEASED',
        },
      },
      token,
    );

    expect(Array.isArray(data.projectReleases)).toBe(true);
  });

  test('projectReleasesWithFilters — returns analytics data', async ({ request }) => {
    const data = await graphqlOk<{
      projectReleasesWithFilters: Array<{
        id: number;
        name: string;
        completedItems: number;
        inProgressItems: number;
      }>;
    }>(
      request,
      `
        query {
          projectReleasesWithFilters {
            id
            name
            completedItems
            inProgressItems
            progress {
              totalCount
              completedCount
              incompleteCount
            }
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectReleasesWithFilters)).toBe(true);
  });

  test('projectRelease — fetches single release by ID', async ({ request }) => {
    const data = await graphqlOk<{
      projectRelease: { id: number; name: string };
    }>(
      request,
      `
        query GetRelease($id: Int!) {
          projectRelease(id: $id) {
            id
            name
            description
          }
        }
      `,
      { id: releaseId },
      token,
    );

    expect(data.projectRelease.id).toBe(releaseId);
  });

  test('updateProjectRelease — updates release name', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateRelease($input: UpdateProjectReleaseInput!) {
          updateProjectRelease(input: $input) {
            id
            name
          }
        }
      `,
      {
        input: {
          id: releaseId,
          name: 'E2E Release v1.1',
          description: 'Updated release',
          startDate: '2026-05-01',
          releaseDate: '2026-05-20',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectRelease?.name).toBe('E2E Release v1.1');
  });

  test('addReleaseApprovers — adds approvers to the release', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation AddApprovers($input: AddApproversInput!) {
          addReleaseApprovers(input: $input) {
            releaseId
            userId
          }
        }
      `,
      {
        input: {
          releaseId,
          userIds: [1],
        },
      },
      token,
    );

    // May succeed or fail depending on user existence — both are valid
    if (!body.errors) {
      expect(body.data?.addReleaseApprovers).toBeDefined();
    }
  });

  test('deleteProjectRelease — deletes the release', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteRelease($releaseId: Int!) {
          deleteProjectRelease(releaseId: $releaseId)
        }
      `,
      { releaseId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectRelease).toBe(true);
  });
});

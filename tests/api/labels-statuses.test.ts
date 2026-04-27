import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Labels and Statuses.
 *
 * Pattern demonstrated:
 * - Creating / updating / deleting lightweight resources
 * - Verifying list queries return created resources
 * - Testing with color hex strings
 */

test.describe('Project Labels', () => {
  let token: string;
  let labelId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectLabel — creates a label', async ({ request }) => {
    const { body } = await graphql<{
      createProjectLabel: { id: number; name: string; color: string };
    }>(
      request,
      `
        mutation CreateLabel($input: CreateProjectLabelInput!) {
          createProjectLabel(input: $input) {
            id
            name
            color
          }
        }
      `,
      {
        input: {
          name: 'E2E Bug',
          color: '#FF0000',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectLabel.name).toBe('E2E Bug');
    expect(body.data?.createProjectLabel.color).toBe('#FF0000');

    labelId = body.data!.createProjectLabel.id;
  });

  test('projectLabels — lists labels for the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectLabels: Array<{ id: number; name: string }>;
    }>(
      request,
      `
        query {
          projectLabels {
            id
            name
            color
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectLabels)).toBe(true);
  });

  test('updateProjectLabel — renames the label', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateLabel($labelId: Int!, $input: UpdateProjectLabelInput!) {
          updateProjectLabel(labelId: $labelId, input: $input) {
            id
            name
            color
          }
        }
      `,
      {
        labelId,
        input: {
          name: 'E2E Critical Bug',
          color: '#CC0000',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectLabel?.name).toBe('E2E Critical Bug');
  });

  test('deleteProjectLabel — deletes the label', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteLabel($labelId: Int!) {
          deleteProjectLabel(labelId: $labelId)
        }
      `,
      { labelId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectLabel).toBe(true);
  });
});

test.describe('Project Statuses', () => {
  let token: string;
  let statusId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectStatus — creates a status', async ({ request }) => {
    const { body } = await graphql<{
      createProjectStatus: { id: number; name: string; color: string };
    }>(
      request,
      `
        mutation CreateStatus($input: AddStatusInput!) {
          createProjectStatus(input: $input) {
            id
            name
            color
            description
          }
        }
      `,
      {
        input: {
          name: 'E2E In Review',
          color: '#FFA500',
          description: 'Items under E2E review',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectStatus.name).toBe('E2E In Review');

    statusId = body.data!.createProjectStatus.id;
  });

  test('projectStatuses — lists all statuses', async ({ request }) => {
    const data = await graphqlOk<{
      projectStatuses: Array<{ id: number; name: string; orderIndex: number }>;
    }>(
      request,
      `
        query {
          projectStatuses {
            id
            name
            color
            orderIndex
            isInitial
            isFinal
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectStatuses)).toBe(true);
  });

  test('projectStatus — fetches a single status by ID', async ({ request }) => {
    const data = await graphqlOk<{
      projectStatus: { id: number; name: string };
    }>(
      request,
      `
        query GetStatus($statusId: Int!) {
          projectStatus(statusId: $statusId) {
            id
            name
            color
          }
        }
      `,
      { statusId },
      token,
    );

    expect(data.projectStatus.id).toBe(statusId);
  });

  test('updateProjectStatus — updates status name', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateStatus($statusId: Int!, $input: UpdateStatusInput!) {
          updateProjectStatus(statusId: $statusId, input: $input) {
            id
            name
          }
        }
      `,
      {
        statusId,
        input: {
          name: 'E2E Reviewed',
          color: '#00FF00',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectStatus?.name).toBe('E2E Reviewed');
  });

  test('deleteProjectStatus — deletes the status', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteStatus($statusId: Int!) {
          deleteProjectStatus(statusId: $statusId)
        }
      `,
      { statusId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectStatus).toBe(true);
  });
});

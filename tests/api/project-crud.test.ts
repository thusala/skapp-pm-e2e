import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Sample E2E tests: Project CRUD operations.
 *
 * Pattern demonstrated:
 * - Creating resources via mutations
 * - Querying single + list resources
 * - Updating resources
 * - Deleting resources (soft delete)
 * - Project-scoped header (x-project-key)
 */

const PROJECT_KEY = `E2EPRJ${Date.now()}`;

test.describe('Project CRUD', () => {
  let token: string;
  let projectId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProject — creates a new project', async ({ request }) => {
    const { status, body } = await graphql<{ createProject: { id: number; key: string; name: string } }>(
      request,
      `
        mutation CreateProject($input: CreateProjectInput!) {
          createProject(input: $input) {
            id
            key
            name
            access
            icon
          }
        }
      `,
      {
        input: {
          key: PROJECT_KEY,
          name: 'E2E Test Project',
          access: 'OPEN',
          template: 'SCRUM',
          icon: 'project',
        },
      },
      token,
    );

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data?.createProject.key).toBe(PROJECT_KEY);
    expect(body.data?.createProject.name).toBe('E2E Test Project');

    projectId = body.data!.createProject.id;
  });

  test('projects — lists all projects', async ({ request }) => {
    const data = await graphqlOk<{ projects: Array<{ id: number; key: string }> }>(
      request,
      `
        query {
          projects {
            id
            key
            name
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projects)).toBe(true);
  });

  test('project — fetches a single project by context', async ({ request }) => {
    // This query uses the project context header to identify the project.
    const response = await request.post('/graphql', {
      headers: {
        Authorization: token,
        'x-project-key': PROJECT_KEY,
      },
      data: {
        query: `
          query {
            project {
              id
              key
              name
              access
            }
          }
        `,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data?.project?.key).toBe(PROJECT_KEY);
  });

  test('updateProject — updates project name', async ({ request }) => {
    const { body } = await graphql<{ updateProject: { id: number; name: string } }>(
      request,
      `
        mutation UpdateProject($input: UpdateProjectInput!) {
          updateProject(input: $input) {
            id
            name
          }
        }
      `,
      {
        input: {
          name: 'E2E Updated Project',
          icon: 'project',
          access: 'OPEN',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProject?.name).toBe('E2E Updated Project');
  });

  test('deleteProject — soft-deletes the project', async ({ request }) => {
    const { body } = await graphql<{ deleteProject: boolean }>(
      request,
      `
        mutation {
          deleteProject
        }
      `,
      {},
      token,
    );

    expect(body.errors).toBeUndefined();
    // deleteProject returns Boolean (true on success)
    expect(body.data?.deleteProject).toBe(true);
  });
});

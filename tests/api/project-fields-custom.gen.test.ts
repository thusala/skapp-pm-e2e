import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * Generated E2E tests: Custom Project Fields.
 * Covers ProjectFieldCustomResolver.
 */

test.describe('Custom Project Fields', () => {
  let token: string;
  let fieldId: number;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('createProjectFieldCustom — creates a custom field', async ({ request }) => {
    const { body } = await graphql<{
      createProjectFieldCustom: { id: number; name: string; type: string };
    }>(
      request,
      `
        mutation CreateField($input: CreateProjectFieldCustomInput!) {
          createProjectFieldCustom(input: $input) {
            id
            name
            type
            fieldLayoutType
          }
        }
      `,
      {
        input: {
          name: 'E2E Custom Field',
          type: 'SHORT_TEXT',
          fieldLayoutType: 'CONTEXT',
          description: 'A field created by E2E tests',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createProjectFieldCustom.name).toBe('E2E Custom Field');
    fieldId = body.data!.createProjectFieldCustom.id;
  });

  test('projectFieldsCustom — lists all custom fields in the project', async ({ request }) => {
    const data = await graphqlOk<{
      projectFieldsCustom: Array<{ id: number; name: string }>;
    }>(
      request,
      `
        query {
          projectFieldsCustom {
            id
            name
            type
          }
        }
      `,
      {},
      token,
    );

    expect(Array.isArray(data.projectFieldsCustom)).toBe(true);
    expect(data.projectFieldsCustom.some(f => f.id === fieldId)).toBe(true);
  });

  test('hasCustomFieldData — checks if field has data', async ({ request }) => {
    const data = await graphqlOk<{
      hasCustomFieldData: boolean;
    }>(
      request,
      `
        query CheckData($fieldId: Int!) {
          hasCustomFieldData(fieldId: $fieldId)
        }
      `,
      { fieldId },
      token,
    );

    expect(typeof data.hasCustomFieldData).toBe('boolean');
  });

  test('updateProjectFieldCustom — updates field details', async ({ request }) => {
    const { body } = await graphql<{
      updateProjectFieldCustom: { id: number; name: string };
    }>(
      request,
      `
        mutation UpdateField($input: UpdateProjectFieldCustomInput!) {
          updateProjectFieldCustom(input: $input) {
            id
            name
          }
        }
      `,
      {
        input: {
          id: fieldId,
          name: 'Updated E2E Field',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateProjectFieldCustom.name).toBe('Updated E2E Field');
  });

  test('deleteProjectFieldCustom — deletes the custom field', async ({ request }) => {
    const { body } = await graphql<{
      deleteProjectFieldCustom: boolean;
    }>(
      request,
      `
        mutation DeleteField($id: Int!) {
          deleteProjectFieldCustom(id: $id)
        }
      `,
      { id: fieldId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteProjectFieldCustom).toBe(true);
  });

  test('createProjectFieldCustom — unauthorized access', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation {
          createProjectFieldCustom(input: {
            name: "Fail",
            type: SHORT_TEXT,
            fieldLayoutType: CONTEXT
          }) {
            id
          }
        }
      `,
      {},
      undefined,
    );

    expect(body.errors).toBeDefined();
    expect(body.errors![0].message).toMatch(/unauthorized|forbidden|login/i);
  });
});

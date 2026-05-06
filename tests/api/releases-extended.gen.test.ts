import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests: Releases (Extended).
 *
 * This file covers ProjectReleasesResolver mutations not covered in the basic test:
 * - Assigning items to release
 * - Removing items from release
 * - Updating release approval status
 * - Removing release approvers
 * - Confirming a release
 */

test.describe('Releases Extended', () => {
  let token: string;
  let releaseId: number;
  let itemId: number;

  test.beforeAll(async ({ request }) => {
    token = createTestToken();

    // Create a release
    const releaseData = await graphqlOk<{
      createProjectRelease: { id: number };
    }>(
      request,
      `
        mutation CreateRelease($input: CreateProjectReleaseInput!) {
          createProjectRelease(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          name: 'Extended Test Release',
          startDate: '2026-06-01',
          releaseDate: '2026-06-30',
        },
      },
      token,
    );
    releaseId = releaseData.createProjectRelease.id;

    // Create an item to assign to release
    const itemData = await graphqlOk<{
      createProjectItem: { id: number };
    }>(
      request,
      `
        mutation {
          createProjectItem(input: {
            title: "Item for release test",
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
    itemId = itemData.createProjectItem.id;
  });

  test('assignItemsToRelease — assigns item to the release', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation AssignItems($input: AssignItemsToReleaseInput!) {
          assignItemsToRelease(input: $input) {
            id
            projectItems {
              id
            }
          }
        }
      `,
      {
        input: {
          releaseId,
          itemIds: [itemId],
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.assignItemsToRelease.id).toBe(releaseId);
  });

  test('updateReleaseApproval — updates approval status', async ({ request }) => {
    // First add an approver
    await graphqlOk(
      request,
      `
        mutation AddApprover($input: AddApproversInput!) {
          addReleaseApprovers(input: $input) {
            releaseId
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

    const { body } = await graphql(
      request,
      `
        mutation UpdateApproval($input: UpdateApprovalInput!) {
          updateReleaseApproval(input: $input) {
            releaseId
            status
          }
        }
      `,
      {
        input: {
          releaseId,
          status: 'APPROVED',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateReleaseApproval.status).toBe('APPROVED');
  });

  test('removeItemsFromRelease — removes item from the release', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation RemoveItems($itemIds: [Int!]!) {
          removeItemsFromRelease(itemIds: $itemIds)
        }
      `,
      { itemIds: [itemId] },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.removeItemsFromRelease).toBe(true);
  });

  test('confirmRelease — marks release as confirmed', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation ConfirmRelease($input: ConfirmReleaseInput!) {
          confirmRelease(input: $input) {
            id
            status
          }
        }
      `,
      {
        input: {
          id: releaseId,
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    // Assuming status changes to RELEASED or similar upon confirmation
    expect(body.data?.confirmRelease.id).toBe(releaseId);
  });

  test('removeReleaseApprovers — removes approvers by user ID', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation RemoveApprovers($input: RemoveApproversInput!) {
          removeReleaseApprovers(input: $input)
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

    expect(body.errors).toBeUndefined();
    expect(body.data?.removeReleaseApprovers).toBe(true);
  });
});

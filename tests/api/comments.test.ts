import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql } from '../helpers/graphql';

/**
 * Sample E2E tests: Comments and Replies.
 *
 * Pattern demonstrated:
 * - Nested mutations (create comment → create reply)
 * - Querying nested relations (comment → replies)
 * - Soft deletion patterns
 * - Testing with dependent resources (requires an item)
 */

test.describe('Comments & Replies', () => {
  let token: string;
  let itemId: number;
  let commentId: number;

  test.beforeAll(async ({ request }) => {
    token = createTestToken();

    // Create a prerequisite item to attach comments to
    const { body } = await graphql<{
      createProjectItem: { id: number };
    }>(
      request,
      `
        mutation {
          createProjectItem(input: {
            title: "Comment test item",
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

    itemId = body.data!.createProjectItem.id;
  });

  test('createComment — creates a comment on an item', async ({ request }) => {
    const { body } = await graphql<{
      createComment: { commentId: number; content: string };
    }>(
      request,
      `
        mutation CreateComment($input: CreateCommentDto!) {
          createComment(input: $input) {
            commentId
            content
          }
        }
      `,
      {
        input: {
          itemId,
          content: 'This is an E2E test comment',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.createComment.content).toBe('This is an E2E test comment');

    commentId = body.data!.createComment.commentId;
  });

  test('itemInfoComments — fetches comments by item ID', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        query GetComments($itemId: Int!) {
          itemInfoComments(itemId: $itemId) {
            commentId
            content
            status
            replies {
              content
            }
          }
        }
      `,
      { itemId },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.itemInfoComments).toBeDefined();
  });

  test('createReply — adds a reply to the comment', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation CreateReply($input: CreateReplyDto!) {
          createReply(input: $input) {
            commentId
            content
          }
        }
      `,
      {
        input: {
          itemId,
          commentId,
          content: 'This is an E2E reply',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
  });

  test('updateComment — edits the comment content', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation UpdateComment($input: UpdateCommentDto!) {
          updateComment(input: $input) {
            commentId
            content
          }
        }
      `,
      {
        input: {
          commentId,
          itemId,
          content: 'E2E comment — updated',
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.updateComment?.content).toBe('E2E comment — updated');
  });

  test('deleteComment — soft-deletes the comment', async ({ request }) => {
    const { body } = await graphql(
      request,
      `
        mutation DeleteComment($input: DeleteCommentDto!) {
          deleteComment(input: $input)
        }
      `,
      {
        input: {
          commentId,
          itemId,
        },
      },
      token,
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.deleteComment).toBe(true);
  });
});

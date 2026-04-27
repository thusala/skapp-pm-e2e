import { APIRequestContext } from '@playwright/test';

/**
 * Reusable helper for sending GraphQL requests.
 * All sample tests import this to keep request logic DRY.
 */

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
    path?: string[];
  }>;
}

/**
 * Send a GraphQL query or mutation and return the parsed response.
 */
export async function graphql<T = unknown>(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<{ status: number; body: GraphQLResponse<T> }> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = token;
  }

  const response = await request.post('/graphql', {
    headers,
    data: { query, variables },
  });

  const body = (await response.json()) as GraphQLResponse<T>;
  return { status: response.status(), body };
}

/**
 * Shorthand: send an authenticated GraphQL request and assert no errors.
 */
export async function graphqlOk<T = unknown>(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
  token?: string,
): Promise<T> {
  const { body } = await graphql<T>(request, query, variables, token);
  if (body.errors) {
    throw new Error(
      `GraphQL errors: ${body.errors.map((e) => e.message).join(', ')}`,
    );
  }
  return body.data as T;
}

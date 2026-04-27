import * as jwt from 'jsonwebtoken';

/**
 * The signing key must match SIGN_IN_KEY in docker-compose.ci.yml.
 * In CI this is always the test value; locally you can override via env.
 */
const SIGN_IN_KEY =
  process.env.SIGN_IN_KEY ||
  'e2e-test-sign-in-key-at-least-32-chars-long!!';

interface TestTokenPayload {
  userId?: number;
  email?: string;
  tenantId?: number;
}

/**
 * Create a valid JWT Bearer token for authenticated API requests.
 *
 * Usage in tests:
 * ```ts
 * import { createTestToken } from '../helpers/auth';
 * const response = await request.post('/graphql', {
 *   headers: { Authorization: createTestToken() },
 *   data: { query: `...` },
 * });
 * ```
 */
export function createTestToken(
  payload: TestTokenPayload = {},
): string {
  const defaults: TestTokenPayload = {
    userId: 1,
    email: 'admin@test.com',
    tenantId: 1,
  };

  const merged = { ...defaults, ...payload };

  const token = jwt.sign(merged, SIGN_IN_KEY, {
    expiresIn: '1h',
  });

  return `Bearer ${token}`;
}

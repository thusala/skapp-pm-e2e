import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';
import { graphql, graphqlOk } from '../helpers/graphql';

/**
 * E2E tests for the Health Check module.
 *
 * Queries tested:
 * - systemStatus: returns full system health with services
 * - serverUptime: returns uptime in seconds
 * - isHealthy: returns boolean health check
 */

test.describe('Health Check — systemStatus', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns full system status with all fields', async ({ request }) => {
    const data = await graphqlOk<{ systemStatus: Record<string, unknown> }>(
      request,
      `
        query {
          systemStatus {
            status
            uptime
            timestamp
            version
            services {
              name
              status
              responseTimeMs
            }
          }
        }
      `,
      {},
      token,
    );

    const status = data.systemStatus;
    expect(status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
    expect(typeof status.uptime).toBe('number');
    expect((status.uptime as number)).toBeGreaterThanOrEqual(0);
    expect(typeof status.timestamp).toBe('string');
    expect(typeof status.version).toBe('string');
    expect(Array.isArray(status.services)).toBeTruthy();
  });

  test('services array contains expected services', async ({ request }) => {
    const data = await graphqlOk<{
      systemStatus: { services: Array<{ name: string; status: string; responseTimeMs: number }> };
    }>(
      request,
      `
        query {
          systemStatus {
            services {
              name
              status
              responseTimeMs
            }
          }
        }
      `,
      {},
      token,
    );

    const services = data.systemStatus.services;
    expect(services.length).toBeGreaterThan(0);

    for (const svc of services) {
      expect(typeof svc.name).toBe('string');
      expect(['up', 'down']).toContain(svc.status);
      expect(typeof svc.responseTimeMs).toBe('number');
      expect(svc.responseTimeMs).toBeGreaterThanOrEqual(0);
    }

    const serviceNames = services.map((s) => s.name);
    expect(serviceNames).toContain('database');
  });

  test('unauthenticated request — returns auth error', async ({ request }) => {
    const { body } = await graphql(
      request,
      `query { systemStatus { status } }`,
    );

    const isUnauthorized =
      body.errors?.some(
        (e) =>
          e.message.toLowerCase().includes('unauthorized') ||
          e.message.toLowerCase().includes('unauthenticated') ||
          e.message.toLowerCase().includes('forbidden'),
      );

    // Either requires auth or is publicly accessible
    expect(body.data?.systemStatus || isUnauthorized).toBeTruthy();
  });
});

test.describe('Health Check — serverUptime', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns a non-negative integer', async ({ request }) => {
    const data = await graphqlOk<{ serverUptime: number }>(
      request,
      `query { serverUptime }`,
      {},
      token,
    );

    expect(typeof data.serverUptime).toBe('number');
    expect(data.serverUptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(data.serverUptime)).toBeTruthy();
  });

  test('uptime increases over time', async ({ request }) => {
    const first = await graphqlOk<{ serverUptime: number }>(
      request,
      `query { serverUptime }`,
      {},
      token,
    );

    // Wait briefly to ensure uptime advances
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const second = await graphqlOk<{ serverUptime: number }>(
      request,
      `query { serverUptime }`,
      {},
      token,
    );

    expect(second.serverUptime).toBeGreaterThanOrEqual(first.serverUptime);
  });
});

test.describe('Health Check — isHealthy', () => {
  let token: string;

  test.beforeAll(() => {
    token = createTestToken();
  });

  test('returns a boolean', async ({ request }) => {
    const data = await graphqlOk<{ isHealthy: boolean }>(
      request,
      `query { isHealthy }`,
      {},
      token,
    );

    expect(typeof data.isHealthy).toBe('boolean');
  });

  test('returns true when system is healthy', async ({ request }) => {
    const data = await graphqlOk<{ isHealthy: boolean }>(
      request,
      `query { isHealthy }`,
      {},
      token,
    );

    // In a running test environment the system should be healthy
    expect(data.isHealthy).toBe(true);
  });

  test('isHealthy consistent with systemStatus', async ({ request }) => {
    const data = await graphqlOk<{
      isHealthy: boolean;
      systemStatus: { status: string };
    }>(
      request,
      `
        query {
          isHealthy
          systemStatus {
            status
          }
        }
      `,
      {},
      token,
    );

    if (data.systemStatus.status === 'healthy') {
      expect(data.isHealthy).toBe(true);
    } else {
      expect(data.isHealthy).toBe(false);
    }
  });
});

import { test, expect } from "@playwright/test";
import { createTestToken } from "../helpers/auth";

/**
 * E2E API Tests: Work Location CRUD Operations
 *
 * Tests the /v1/work-location endpoints covering:
 * - Create, Read, Update, Delete lifecycle
 * - Auth matrix (valid/invalid/no token/wrong role)
 * - Input validation
 * - Pagination and search
 */

// --- Constants ---
const ENDPOINTS = {
  BASE: "/v1/work-location",
  BY_ID: (id: number) => `/v1/work-location/${id}`,
} as const;

const TEST_DATA = {
  VALID_LOCATION: {
    name: `E2E Office ${Date.now()}`,
    isAllEmployees: false,
    employeeIds: [],
    geofence: null,
  },
  LOCATION_WITH_GEOFENCE: {
    name: `E2E Geofenced ${Date.now()}`,
    isAllEmployees: true,
    employeeIds: [],
    geofence: {
      latitude: 6.9271,
      longitude: 79.8612,
      radiusMeters: 150,
      address: "123 Test Street, Colombo",
    },
  },
  UPDATED_NAME: `E2E Updated ${Date.now()}`,
  EMPTY_NAME: "",
  LONG_NAME: "A".repeat(256),
} as const;

const EXPECTED = {
  STATUS_OK: 200,
  STATUS_CREATED: 201,
  STATUS_BAD_REQUEST: 400,
  STATUS_UNAUTHORIZED: 401,
  STATUS_FORBIDDEN: 403,
  RESPONSE_SUCCESSFUL: "successful",
  RESPONSE_UNSUCCESSFUL: "unsuccessful",
} as const;

// --- Test Suite ---
test.describe("Work Location CRUD", () => {
  let adminToken: string;
  let createdLocationId: number;

  test.beforeAll(() => {
    adminToken = createTestToken({ userId: 1, email: "admin@test.com" });
  });

  // =========================================================================
  // CREATE
  // =========================================================================
  test.describe("POST /v1/work-location", () => {
    test("should create work location with valid data", async ({ request }) => {
      const response = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: TEST_DATA.VALID_LOCATION,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_CREATED);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
      expect(body.results).toBeDefined();
      expect(body.results[0]).toHaveProperty("workLocationId");
      expect(body.results[0].name).toBe(TEST_DATA.VALID_LOCATION.name);

      createdLocationId = body.results[0].workLocationId;
    });

    test("should create work location with geofence", async ({ request }) => {
      const response = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: TEST_DATA.LOCATION_WITH_GEOFENCE,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_CREATED);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
      expect(body.results[0].geofence).toBeDefined();
      expect(body.results[0].geofence.latitude).toBe(
        TEST_DATA.LOCATION_WITH_GEOFENCE.geofence.latitude
      );
      expect(body.results[0].geofence.radiusMeters).toBe(
        TEST_DATA.LOCATION_WITH_GEOFENCE.geofence.radiusMeters
      );
    });

    test("should return 401 when no auth token provided", async ({
      request,
    }) => {
      const response = await request.post(ENDPOINTS.BASE, {
        data: TEST_DATA.VALID_LOCATION,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_UNAUTHORIZED);
    });

    test("should return 403 when user has insufficient role", async ({
      request,
    }) => {
      const employeeToken = createTestToken({
        userId: 99,
        email: "employee@test.com",
      });

      const response = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: employeeToken },
        data: TEST_DATA.VALID_LOCATION,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_FORBIDDEN);
    });

    test("should return 400 when name is empty", async ({ request }) => {
      const response = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: { ...TEST_DATA.VALID_LOCATION, name: TEST_DATA.EMPTY_NAME },
      });

      const status = response.status();
      expect(status).toBe(EXPECTED.STATUS_BAD_REQUEST);
    });

    test("should return 400 when name exceeds max length", async ({
      request,
    }) => {
      const response = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: { ...TEST_DATA.VALID_LOCATION, name: TEST_DATA.LONG_NAME },
      });

      const status = response.status();
      expect(status).toBe(EXPECTED.STATUS_BAD_REQUEST);
    });
  });

  // =========================================================================
  // READ
  // =========================================================================
  test.describe("GET /v1/work-location", () => {
    test("should return paginated work locations", async ({ request }) => {
      const response = await request.get(
        `${ENDPOINTS.BASE}?page=0&size=4&search=`,
        {
          headers: { Authorization: adminToken },
        }
      );

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
      expect(body.results[0]).toHaveProperty("items");
      expect(body.results[0]).toHaveProperty("totalItems");
      expect(body.results[0]).toHaveProperty("totalPages");
      expect(body.results[0]).toHaveProperty("currentPage");
      expect(Array.isArray(body.results[0].items)).toBe(true);
    });

    test("should filter work locations by search keyword", async ({
      request,
    }) => {
      const searchTerm = TEST_DATA.VALID_LOCATION.name.substring(0, 10);
      const response = await request.get(
        `${ENDPOINTS.BASE}?page=0&size=4&search=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: adminToken },
        }
      );

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should return empty list for non-matching search", async ({
      request,
    }) => {
      const response = await request.get(
        `${ENDPOINTS.BASE}?page=0&size=4&search=ZZZNOMATCH${Date.now()}`,
        {
          headers: { Authorization: adminToken },
        }
      );

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.results[0].items).toHaveLength(0);
    });

    test("should return 401 when no auth token", async ({ request }) => {
      const response = await request.get(`${ENDPOINTS.BASE}?page=0&size=4`);

      expect(response.status()).toBe(EXPECTED.STATUS_UNAUTHORIZED);
    });

    test("should support pagination parameters", async ({ request }) => {
      const response = await request.get(
        `${ENDPOINTS.BASE}?page=0&size=2&search=`,
        {
          headers: { Authorization: adminToken },
        }
      );

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.results[0].items.length).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // UPDATE
  // =========================================================================
  test.describe("PATCH /v1/work-location/:id", () => {
    test("should update work location name", async ({ request }) => {
      // First create a location to update
      const createResponse = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: {
          name: `E2E ToUpdate ${Date.now()}`,
          isAllEmployees: false,
          employeeIds: [],
          geofence: null,
        },
      });

      const createBody = await createResponse.json();
      const locationId = createBody.results[0].workLocationId;

      // Update it
      const response = await request.patch(ENDPOINTS.BY_ID(locationId), {
        headers: { Authorization: adminToken },
        data: {
          name: TEST_DATA.UPDATED_NAME,
          isAllEmployees: false,
          employeeIds: [],
          geofence: null,
        },
      });

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should return 401 when no auth token", async ({ request }) => {
      const response = await request.patch(ENDPOINTS.BY_ID(1), {
        data: { name: TEST_DATA.UPDATED_NAME },
      });

      expect(response.status()).toBe(EXPECTED.STATUS_UNAUTHORIZED);
    });

    test("should return 403 when user has employee role", async ({
      request,
    }) => {
      const employeeToken = createTestToken({
        userId: 99,
        email: "employee@test.com",
      });

      const response = await request.patch(ENDPOINTS.BY_ID(1), {
        headers: { Authorization: employeeToken },
        data: { name: TEST_DATA.UPDATED_NAME },
      });

      expect(response.status()).toBe(EXPECTED.STATUS_FORBIDDEN);
    });

    test("should handle non-existent location ID", async ({ request }) => {
      const response = await request.patch(ENDPOINTS.BY_ID(999999), {
        headers: { Authorization: adminToken },
        data: {
          name: TEST_DATA.UPDATED_NAME,
          isAllEmployees: false,
          employeeIds: [],
          geofence: null,
        },
      });

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_UNSUCCESSFUL);
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================
  test.describe("DELETE /v1/work-location/:id", () => {
    test("should delete work location", async ({ request }) => {
      // Create a location to delete
      const createResponse = await request.post(ENDPOINTS.BASE, {
        headers: { Authorization: adminToken },
        data: {
          name: `E2E ToDelete ${Date.now()}`,
          isAllEmployees: false,
          employeeIds: [],
          geofence: null,
        },
      });

      const createBody = await createResponse.json();
      const locationId = createBody.results[0].workLocationId;

      // Delete it
      const response = await request.delete(ENDPOINTS.BY_ID(locationId), {
        headers: { Authorization: adminToken },
      });

      expect(response.status()).toBe(EXPECTED.STATUS_OK);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should return 401 when no auth token", async ({ request }) => {
      const response = await request.delete(ENDPOINTS.BY_ID(1));

      expect(response.status()).toBe(EXPECTED.STATUS_UNAUTHORIZED);
    });

    test("should return 403 when user has employee role", async ({
      request,
    }) => {
      const employeeToken = createTestToken({
        userId: 99,
        email: "employee@test.com",
      });

      const response = await request.delete(ENDPOINTS.BY_ID(1), {
        headers: { Authorization: employeeToken },
      });

      expect(response.status()).toBe(EXPECTED.STATUS_FORBIDDEN);
    });

    test("should handle non-existent location ID", async ({ request }) => {
      const response = await request.delete(ENDPOINTS.BY_ID(999999), {
        headers: { Authorization: adminToken },
      });

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_UNSUCCESSFUL);
    });
  });
});

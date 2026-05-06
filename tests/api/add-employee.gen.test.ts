import { test, expect } from "@playwright/test";
import { createTestToken } from "../helpers/auth";

/**
 * E2E API Tests: Add Employee Flow (People Module)
 *
 * Tests the /v1/people/employees endpoint covering:
 * - Creating employees with all required fields
 * - Work location assignment during employee creation
 * - Validation of required fields
 * - Auth matrix
 * - Employment details including workLocationId
 */

// --- Constants ---
const ENDPOINTS = {
  EMPLOYEES: "/v1/people/employees",
  EMPLOYEE_BY_ID: (id: number) => `/v1/people/employees/${id}`,
  WORK_LOCATIONS: "/v1/work-location",
} as const;

const TEST_DATA = {
  VALID_EMPLOYEE: {
    firstName: `E2EFirst${Date.now()}`,
    lastName: `E2ELast${Date.now()}`,
    middleName: "",
    title: null,
    workEmail: `e2e_${Date.now()}@test.skapp.local`,
    identificationNo: `EMP-E2E-${Date.now()}`,
    phone: "+94771234567",
    address: "123 Test Lane",
    gender: null,
    joinDate: "2024-06-01",
    teams: [],
    employmentAllocation: "FULL_TIME",
    employmentStatus: "ACTIVE",
    primaryManager: null,
    secondaryManager: null,
    timeZone: "Asia/Colombo",
    workLocationId: null as number | null,
    probationPeriod: {
      startDate: "2024-06-01",
      endDate: "2024-09-01",
    },
    employeeProgressions: [],
    employeeVisas: [],
    employeeEmergency: [],
    employeeFamilies: [],
    employeeEducations: [],
    employeePersonalInfo: {
      city: "Colombo",
      state: "Western",
      birthDate: "1990-01-15",
      maritalStatus: null,
      nationality: "Sri Lankan",
      nin: null,
      ethnicity: null,
      ssn: null,
      postalCode: "10100",
      passportNo: null,
      previousEmploymentDetails: [],
      socialMediaDetails: {
        facebook: null,
        linkedIn: null,
        x: null,
        instagram: null,
      },
      extraInfo: {
        bloodGroup: null,
        allergies: null,
        dietaryRestrictions: null,
        tshirtSize: null,
      },
    },
    userRoles: {},
  },
  MINIMAL_EMPLOYEE: {
    firstName: `MinFirst${Date.now()}`,
    lastName: `MinLast${Date.now()}`,
    workEmail: `min_${Date.now()}@test.skapp.local`,
    identificationNo: `MIN-${Date.now()}`,
    joinDate: "2024-06-01",
    employmentAllocation: "FULL_TIME",
    employmentStatus: "ACTIVE",
  },
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
test.describe("Add Employee Flow", () => {
  let adminToken: string;
  let workLocationId: number | null = null;

  test.beforeAll(async ({ request }) => {
    adminToken = createTestToken({ userId: 1, email: "admin@test.com" });

    // Create a work location to assign to employee
    const wlResponse = await request.post(ENDPOINTS.WORK_LOCATIONS, {
      headers: { Authorization: adminToken },
      data: {
        name: `E2E WL for Emp ${Date.now()}`,
        isAllEmployees: false,
        employeeIds: [],
        geofence: null,
      },
    });

    if (wlResponse.status() === 201) {
      const wlBody = await wlResponse.json();
      workLocationId = wlBody.results?.[0]?.workLocationId ?? null;
    }
  });

  // =========================================================================
  // CREATE EMPLOYEE
  // =========================================================================
  test.describe("POST /v1/people/employees", () => {
    test("should create employee with full details", async ({ request }) => {
      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: TEST_DATA.VALID_EMPLOYEE,
      });

      const status = response.status();
      expect([EXPECTED.STATUS_OK, EXPECTED.STATUS_CREATED]).toContain(status);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should create employee with work location assigned", async ({
      request,
    }) => {
      const employeeWithLocation = {
        ...TEST_DATA.VALID_EMPLOYEE,
        firstName: `WLEmp${Date.now()}`,
        workEmail: `wl_emp_${Date.now()}@test.skapp.local`,
        identificationNo: `WL-EMP-${Date.now()}`,
        workLocationId: workLocationId,
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: employeeWithLocation,
      });

      const status = response.status();
      expect([EXPECTED.STATUS_OK, EXPECTED.STATUS_CREATED]).toContain(status);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should create employee without work location", async ({
      request,
    }) => {
      const employeeNoLocation = {
        ...TEST_DATA.VALID_EMPLOYEE,
        firstName: `NoWL${Date.now()}`,
        workEmail: `nowl_${Date.now()}@test.skapp.local`,
        identificationNo: `NOWL-${Date.now()}`,
        workLocationId: null,
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: employeeNoLocation,
      });

      const status = response.status();
      expect([EXPECTED.STATUS_OK, EXPECTED.STATUS_CREATED]).toContain(status);

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_SUCCESSFUL);
    });

    test("should return 401 when no auth token", async ({ request }) => {
      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        data: TEST_DATA.VALID_EMPLOYEE,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_UNAUTHORIZED);
    });

    test("should return 403 for employee role", async ({ request }) => {
      const employeeToken = createTestToken({
        userId: 99,
        email: "regular@test.com",
      });

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: employeeToken },
        data: TEST_DATA.VALID_EMPLOYEE,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_FORBIDDEN);
    });

    test("should return 400 when firstName is missing", async ({
      request,
    }) => {
      const invalidData = {
        ...TEST_DATA.VALID_EMPLOYEE,
        firstName: "",
        workEmail: `nofirst_${Date.now()}@test.skapp.local`,
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: invalidData,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_BAD_REQUEST);
    });

    test("should return 400 when lastName is missing", async ({ request }) => {
      const invalidData = {
        ...TEST_DATA.VALID_EMPLOYEE,
        lastName: "",
        workEmail: `nolast_${Date.now()}@test.skapp.local`,
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: invalidData,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_BAD_REQUEST);
    });

    test("should return 400 when workEmail is invalid format", async ({
      request,
    }) => {
      const invalidData = {
        ...TEST_DATA.VALID_EMPLOYEE,
        workEmail: "not-an-email",
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: invalidData,
      });

      expect(response.status()).toBe(EXPECTED.STATUS_BAD_REQUEST);
    });

    test("should return error for duplicate workEmail", async ({ request }) => {
      const uniqueEmail = `dup_${Date.now()}@test.skapp.local`;

      // Create first employee
      await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: {
          ...TEST_DATA.VALID_EMPLOYEE,
          firstName: `Dup1_${Date.now()}`,
          workEmail: uniqueEmail,
          identificationNo: `DUP1-${Date.now()}`,
        },
      });

      // Try to create second with same email
      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: {
          ...TEST_DATA.VALID_EMPLOYEE,
          firstName: `Dup2_${Date.now()}`,
          workEmail: uniqueEmail,
          identificationNo: `DUP2-${Date.now()}`,
        },
      });

      const body = await response.json();
      expect(body.status).toBe(EXPECTED.RESPONSE_UNSUCCESSFUL);
    });

    test("should handle invalid workLocationId gracefully", async ({
      request,
    }) => {
      const invalidData = {
        ...TEST_DATA.VALID_EMPLOYEE,
        firstName: `BadWL${Date.now()}`,
        workEmail: `badwl_${Date.now()}@test.skapp.local`,
        identificationNo: `BADWL-${Date.now()}`,
        workLocationId: 999999,
      };

      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: invalidData,
      });

      const body = await response.json();
      // Should either reject or ignore the invalid location
      expect([EXPECTED.STATUS_BAD_REQUEST, EXPECTED.STATUS_OK]).toContain(
        response.status()
      );
    });
  });

  // =========================================================================
  // EMPLOYEE WITH EMPLOYMENT ALLOCATION TYPES
  // =========================================================================
  test.describe("Employment Allocation Validation", () => {
    test("should accept FULL_TIME allocation", async ({ request }) => {
      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: {
          ...TEST_DATA.VALID_EMPLOYEE,
          firstName: `FT${Date.now()}`,
          workEmail: `ft_${Date.now()}@test.skapp.local`,
          identificationNo: `FT-${Date.now()}`,
          employmentAllocation: "FULL_TIME",
        },
      });

      const status = response.status();
      expect([EXPECTED.STATUS_OK, EXPECTED.STATUS_CREATED]).toContain(status);
    });

    test("should accept PART_TIME allocation", async ({ request }) => {
      const response = await request.post(ENDPOINTS.EMPLOYEES, {
        headers: { Authorization: adminToken },
        data: {
          ...TEST_DATA.VALID_EMPLOYEE,
          firstName: `PT${Date.now()}`,
          workEmail: `pt_${Date.now()}@test.skapp.local`,
          identificationNo: `PT-${Date.now()}`,
          employmentAllocation: "PART_TIME",
        },
      });

      const status = response.status();
      expect([EXPECTED.STATUS_OK, EXPECTED.STATUS_CREATED]).toContain(status);
    });
  });
});

# Gemini CLI Context — skapp-pm-e2e

## Project Overview
This is an E2E API test repository for the **skapp-pm** backend (NestJS + GraphQL).
Tests are written using **Playwright's API testing** capabilities (no browser needed).

## Key Files
- `source/backend/graphql/schema.gql` — Full GraphQL schema (auto-generated)
- `source/backend/src/` — Backend source code (resolvers, services, modules)
- `tests/helpers/graphql.ts` — `graphql()` and `graphqlOk()` request helpers
- `tests/helpers/auth.ts` — `createTestToken()` JWT helper
- `tests/api/*.test.ts` — Existing hand-written sample tests (style reference)
- `playwright.config.ts` — Playwright config (baseURL: http://localhost:3000)

## Test Generation Rules
When generating new test files:
1. **Always** read existing tests in `tests/api/` first — match their style exactly
2. **Always** use helpers from `tests/helpers/` — never write raw fetch calls
3. Write files to `tests/api/<module-name>.gen.test.ts` (`.gen.` suffix for generated)
4. **Never** overwrite existing `.test.ts` files
5. Each file covers one module/resolver
6. Include: happy path, error cases, validation, auth failures
7. Use `test.describe()` blocks and `test.beforeAll()` for prerequisites

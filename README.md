# skapp-pm-e2e

Automated E2E API tests for [rootcodelabs/skapp-pm](https://github.com/rootcodelabs/skapp-pm) backend.

## How it works

1. A PR is opened in `rootcodelabs/skapp-pm` touching `backend/**` files
2. The `e2e-trigger.yml` workflow fires a `repository_dispatch` event to this repo
3. This repo's `generate-and-test.yml` workflow:
   - Checks out the source at the PR's commit SHA
   - Generates Playwright API tests via GitHub Models API (Copilot)
   - Spins up Postgres + Redis + Backend via Docker Compose
   - Runs the generated tests against the live backend
   - Opens a PR in this repo with the generated tests and ✅/❌ results
   - Posts a status comment on the source PR

## Local development

### Prerequisites

- Node.js 22+
- Docker & Docker Compose

### Setup

```bash
npm install
```

### Run tests locally

```bash
# Start the backend stack (Postgres + Redis + Backend)
npm run docker:up

# Wait for backend to be ready, then run tests
npx playwright test

# Tear down
npm run docker:down
```

### Write manual tests

Add test files to `tests/api/`. Use the existing tests and `tests/helpers/auth.ts` as reference:

```typescript
import { test, expect } from '@playwright/test';
import { createTestToken } from '../helpers/auth';

test.describe('My API tests', () => {
  test('query returns data', async ({ request }) => {
    const token = createTestToken();
    const response = await request.post('/graphql', {
      headers: { Authorization: token },
      data: {
        query: `query { myQuery { id name } }`,
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.myQuery).toBeDefined();
  });
});
```

## Required secrets

| Secret | Where | Description |
|--------|-------|-------------|
| `SOURCE_REPO_TOKEN` | This repo | PAT with `repo` scope on `rootcodelabs/skapp-pm` (for checkout + PR comments) |
| `NPM_READ_TOKEN` | This repo | Token to read `@rootcodelabs` packages from GitHub Packages |
| `COPILOT_API_TOKEN` | This repo | (Optional) Copilot API token — falls back to GitHub Models API |
| `E2E_REPO_TOKEN` | `rootcodelabs/skapp-pm` | PAT with `repo` scope on this repo (for `repository_dispatch`) |

## Architecture

```
rootcodelabs/skapp-pm                    thusala/skapp-pm-e2e (this repo)
┌─────────────────────┐  dispatch event  ┌──────────────────────────┐
│ e2e-trigger.yml     │ ───────────────▶ │ generate-and-test.yml    │
│ (on: pull_request)  │  payload: sha,   │ (on: repository_dispatch)│
│                     │  branch, files   │                          │
│ backend/            │                  │ docker/ (compose stack)  │
│   graphql/          │                  │ tests/api/ (Playwright)  │
└─────────────────────┘                  └──────────────────────────┘
```

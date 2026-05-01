# E2E API Test Automation Pipeline

Fully automated pipeline that generates, runs, and opens PRs for E2E API tests whenever backend code is merged.

---

## High-Level Flow

```
 thusala/skapp-pm                                    thusala/skapp-pm-e2e
┌──────────────────────────┐                        ┌──────────────────────────────────┐
│                          │                        │                                  │
│  1. Developer merges PR  │   repository_dispatch  │  3. Checkout source at merge SHA  │
│     to develop/main      │ ─────────────────────▶ │  4. Install Gemini CLI            │
│     (touches backend/)   │   payload:             │  5. Generate Playwright tests     │
│                          │   - merge_commit_sha   │  6. Run tests against dev env     │
│  2. e2e-trigger.yml      │   - changed_files      │  7. Open PR with results          │
│     fires automatically  │   - pr_number          │  8. Comment back on source PR     │
│                          │   - pr_title, etc.     │                                  │
└──────────────────────────┘                        └──────────────────────────────────┘
```

---

## Repositories

| Repository | Role |
|------------|------|
| **thusala/skapp-pm** | Source backend repo. Contains the trigger workflow (`e2e-trigger.yml`) |
| **thusala/skapp-pm-e2e** | E2E test repo. Contains the test generation workflow (`generate-and-test.yml`), Playwright config, test helpers, and generated tests |

---

## Step-by-Step Breakdown

### Phase 1: Trigger (thusala/skapp-pm)

**Workflow:** `.github/workflows/e2e-trigger.yml`

**When:** A PR is **merged** (not just opened) into `develop` or `main` that touches files under `backend/`.

```yaml
on:
  pull_request:
    types: [closed]          # Only on close
    branches: [develop, main]
    paths: ['backend/**']

jobs:
  trigger-e2e:
    if: github.event.pull_request.merged == true   # Only if actually merged
```

**Steps:**

1. **Checkout** the repo with full history (`fetch-depth: 0`)
2. **Compute changeset** using the merge commit:
   ```bash
   MERGE_SHA="${{ github.event.pull_request.merge_commit_sha }}"
   git diff --name-only "${MERGE_SHA}^1" "${MERGE_SHA}"
   ```
   - `MERGE_SHA^1` = state of the base branch before merge
   - `MERGE_SHA` = state after merge
   - The diff = exactly what the PR introduced
   - Filters to `backend/src/**/*.ts` files only (excludes `.spec.ts`, `.d.ts`)

3. **Fire `repository_dispatch`** to the E2E repo with payload:
   ```json
   {
     "event_type": "generate-e2e-tests",
     "client_payload": {
       "commit_sha": "<merge commit SHA>",
       "branch": "develop",
       "pr_number": "2",
       "pr_title": "feat: add user endpoints",
       "pr_url": "https://github.com/thusala/skapp-pm/pull/2",
       "pr_author": "thusala",
       "source_repo": "thusala/skapp-pm",
       "changed_files": ["backend/src/common/modules/user/user.resolver.ts"]
     }
   }
   ```

### Phase 2: Generate & Test (thusala/skapp-pm-e2e)

**Workflow:** `.github/workflows/generate-and-test.yml`

**Triggered by:** `repository_dispatch` (automatic) or `workflow_dispatch` (manual fallback)

**Steps:**

| # | Step | Description |
|---|------|-------------|
| 1 | **Checkout E2E repo** | Clones `thusala/skapp-pm-e2e` |
| 2 | **Checkout source** | Clones `thusala/skapp-pm` at the exact merge commit SHA |
| 3 | **Setup Node.js** | Installs Node.js 22 |
| 4 | **Install dependencies** | Runs `npm ci` for the E2E repo |
| 5 | **Extract payload** | Parses changed files list and schema from dispatch payload |
| 6 | **Prepare context** | Builds the changed files list for Gemini's prompt |
| 7 | **Install Gemini CLI** | `npm install -g @google/gemini-cli` |
| 8 | **Generate tests** | Runs Gemini CLI with a detailed prompt (see below) |
| 9 | **Detect test files** | Finds all new/modified `.test.ts` and `.spec.ts` files |
| 10 | **Run Playwright** | Executes tests against `https://app-api.skapp.dev` |
| 11 | **Commit & open PR** | Pushes generated tests and creates a PR |
| 12 | **Comment on source PR** | Posts ✅/❌ status comment back on the original PR |

### Phase 3: AI Test Generation (Gemini CLI)

Gemini CLI runs in **headless mode** with the `--yolo` flag (fully autonomous, no user prompts).

**What Gemini does:**
1. Reads the GraphQL schema from `source/backend/graphql/schema.gql` (if available) or scans resolver decorators
2. Reads ALL existing tests in `tests/api/` to learn the project's test patterns
3. Reads the helper files (`tests/helpers/auth.ts`, `tests/helpers/graphql.ts`)
4. Reads the changed source files to understand new/modified code
5. Generates new Playwright test files as `tests/api/<module>.gen.test.ts`

**Environment variables:**
- `GEMINI_API_KEY` — API key for Gemini
- `GEMINI_CLI_TRUST_WORKSPACE=true` — Required for CI (non-interactive) environments

### Phase 4: Test Execution

Tests run against the **dev environment** at `https://app-api.skapp.dev`:
- `API_BASE_URL` environment variable is set in the workflow
- `playwright.config.ts` reads `process.env.API_BASE_URL || 'http://localhost:3000'`
- Auth uses JWT tokens created by `tests/helpers/auth.ts`

### Phase 5: PR Creation

The workflow creates a PR on `thusala/skapp-pm-e2e` with:
- **Branch:** `feat/e2e-api-pr-<PR_NUMBER>`
- **Title:** `test(e2e): API tests for thusala/skapp-pm#<N> — <PR title>`
- **Body includes:**
  - Link to the source PR
  - Test results (✅ passed / ❌ failed with details)
  - List of source files covered
  - List of generated test files
  - Instructions to run locally if tests failed

---

## Changeset Computation

The changeset is computed from the **merge commit**, not the PR branch:

```
         develop                    merge commit
           │                            │
           ▼                            ▼
    ───○───○───○───────────────────○ (MERGE_SHA)
                \                 /
                 ○───○───○───○──○
                 ^               ^
              branch start    last commit
```

```bash
git diff --name-only "${MERGE_SHA}^1" "${MERGE_SHA}"
```

- `MERGE_SHA^1` = first parent = tip of `develop` before the merge
- `MERGE_SHA` = the merge commit itself
- **Result:** exactly the files the PR changed, regardless of what else was merged in between

This is more accurate than `origin/develop...HEAD` because it accounts for any intermediate merges.

---

## Secrets Configuration

### On `thusala/skapp-pm`:

| Secret/Variable | Type | Description |
|----------------|------|-------------|
| `E2E_REPO_TOKEN` | Secret | PAT with `repo` scope on `thusala/skapp-pm-e2e` (for `repository_dispatch`) |
| `E2E_REPO_OWNER` | Variable (optional) | Defaults to `thusala` |
| `E2E_REPO_NAME` | Variable (optional) | Defaults to `skapp-pm-e2e` |

### On `thusala/skapp-pm-e2e`:

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI test generation |
| `SOURCE_REPO_TOKEN` | PAT with `repo` scope on `thusala/skapp-pm` (for checkout + PR comments) |
| `GITHUB_TOKEN` | Auto-provided. Must have "Allow GitHub Actions to create and approve pull requests" enabled in repo settings |

---

## Manual Trigger

The E2E pipeline can also be triggered manually from the GitHub Actions UI:

1. Go to **thusala/skapp-pm-e2e** → **Actions** → **Generate & Run E2E API Tests**
2. Click **Run workflow**
3. Enter the commit SHA from `thusala/skapp-pm` to test against
4. Optionally fill in PR number and title
5. Click **Run workflow**

This is useful for:
- Re-running test generation for a specific commit
- Testing against a branch without merging
- Debugging pipeline issues

---

## File Structure

```
thusala/skapp-pm-e2e/
├── .github/workflows/
│   └── generate-and-test.yml     # Main pipeline workflow
├── tests/
│   ├── api/
│   │   ├── *.test.ts             # Hand-written reference tests
│   │   └── *.gen.test.ts         # AI-generated tests
│   └── helpers/
│       ├── auth.ts               # createTestToken() — JWT helper
│       └── graphql.ts            # graphql(), graphqlOk() — request helpers
├── playwright.config.ts          # Playwright config (reads API_BASE_URL)
├── GEMINI.md                     # Persistent context for Gemini CLI
├── package.json                  # Dependencies (@playwright/test, jsonwebtoken)
└── E2E_PIPELINE.md               # This file

thusala/skapp-pm/
├── .github/workflows/
│   └── e2e-trigger.yml           # Trigger workflow (fires on PR merge)
└── backend/                      # NestJS GraphQL backend
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Trigger workflow doesn't fire | PR was closed without merging, or no `backend/` files changed | Check PR was merged and paths match |
| E2E workflow not triggered | `E2E_REPO_TOKEN` missing or expired | Regenerate PAT and update secret |
| Gemini CLI exits with code 55 | Missing `GEMINI_CLI_TRUST_WORKSPACE` env var | Ensure it's set to `"true"` in the workflow |
| Source checkout fails | `SOURCE_REPO_TOKEN` lacks access | Ensure PAT has `repo` scope on source repo |
| No tests generated | Gemini couldn't find relevant code or schema | Check the Gemini CLI output in the workflow logs |
| Tests fail against dev env | Dev environment is down or data mismatch | Check `https://app-api.skapp.dev` is accessible |
| PR creation fails | GitHub Actions doesn't have PR permission | Enable "Allow GitHub Actions to create and approve pull requests" in repo settings |

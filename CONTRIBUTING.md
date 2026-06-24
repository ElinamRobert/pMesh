# Contributing to ProductPilot AI

---

## Branch Strategy

We use a **trunk-based development** model with short-lived feature branches.

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Direct pushes are blocked. |
| `develop` | Integration branch. PRs merge here first. |
| `claude/<name>` | AI-assisted development branches |
| `feature/<ticket>-<description>` | New features (e.g. `feature/PP-42-ai-story-generation`) |
| `fix/<ticket>-<description>` | Bug fixes (e.g. `fix/PP-89-memory-retrieval-timeout`) |
| `chore/<description>` | Non-functional work (e.g. `chore/update-dependencies`) |

---

## Commit Convention

We follow **Conventional Commits**.

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, dependency updates |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `ci` | CI/CD configuration |

### Scopes

`auth` | `projects` | `features` | `epics` | `stories` | `roadmap` | `ai` | `memory` | `db` | `ui` | `api`

### Examples

```bash
feat(features): add AI bulk generation endpoint
fix(auth): handle expired Supabase session on API routes
chore(deps): update Anthropic SDK to 0.40.0
docs(api): add roadmap scheduling endpoint reference
```

---

## Pull Request Process

1. **Branch from** `develop`, not `main`
2. **Keep PRs small** — one concern per PR. Reviewers should be able to review in under 20 minutes.
3. **PR title** must follow the commit convention format
4. **Fill in the PR template** — summary, test plan, screenshots for UI changes
5. **All checks must pass** before merge: typecheck, lint, build
6. **Squash merge** into `develop` to keep history clean

### PR Template

```markdown
## Summary
- What changed and why

## Test Plan
- [ ] Tested locally
- [ ] Verified on mobile viewport (for UI changes)
- [ ] Checked dark mode (for UI changes)
- [ ] Verified no regressions in adjacent features

## Screenshots
(attach for any UI changes)
```

---

## Code Standards

### TypeScript

- **Strict mode** is enabled — no `any`, no `@ts-ignore` without explanation
- Prefer `interface` over `type` for object shapes
- Export types from `src/types/` for cross-module use
- Use Zod schemas at API boundaries — validate input, never trust it

### React / Next.js

- **Server Components by default** — only add `"use client"` when you need browser APIs, event handlers, or Zustand
- **No prop drilling beyond 2 levels** — use Zustand for shared UI state, React Query for server state
- Co-locate component-specific hooks with their component
- `loading.tsx` and `error.tsx` for every route segment that makes async calls

### API Routes

- Every route must call `getAuthContext()` first and return `Errors.unauthorized()` if null
- Validate all input with Zod before touching the database
- Write to `AuditLog` on every mutating operation (create, update, status change)
- Use `ok()` / `err()` / `Errors.*` helpers — never construct `NextResponse.json` directly

### Database / Prisma

- Never use `prisma.$queryRaw` unless pgvector vector operations require it
- Always filter by `organizationId` in application code — defense in depth alongside RLS
- Prefer `select` to limit returned fields on list queries
- Use `findFirst` over `findUnique` when you need to filter by org as well as ID

### AI Layer

- Never construct prompts inline in API routes — use the dedicated prompt builders in `lib/ai/`
- Always run context assembly before calling Claude — never call Claude with zero context
- Log `inputTokens` and `outputTokens` on every `AIMessage` record for cost tracking
- Async-embed on creation — never block the API response waiting for embeddings

### Styling

- Tailwind utility classes only — no custom CSS except in `globals.css`
- Use `cn()` for conditional class merging
- Dark mode is the default — always verify components in dark mode
- Use semantic color tokens (`bg-background`, `text-muted-foreground`) not raw colors

---

## Local Development Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run dev server
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Environment

Copy `.env.example` to `.env.local` and fill in all values before starting the dev server. See [README.md](README.md#environment-variables) for variable descriptions.

Never commit `.env.local` or any file containing real credentials.

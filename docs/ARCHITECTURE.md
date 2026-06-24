# System Architecture

---

## Overview

ProductPilot AI is a multi-tenant SaaS application built on Next.js 15 with a PostgreSQL backend. The architecture is designed to be **serverless-first** in v1 (all compute in Next.js API routes / Vercel Functions), with a clear migration path to a dedicated NestJS backend in v2 when async job requirements outgrow what serverless handles cleanly.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│                                                                 │
│  Next.js App Router    Zustand Stores    React Query Cache      │
│  ─────────────────     ─────────────    ──────────────────      │
│  Server Components     WorkspaceSession  projects               │
│  Client Components     AIAssistant       features               │
│  Streaming (SSE)       UI                epics / stories        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                     Next.js API Routes                          │
│                    (Vercel Functions)                           │
│                                                                 │
│  /api/projects          /api/features        /api/epics         │
│  /api/stories           /api/roadmaps        /api/ai/chat       │
│  /api/ai/features/generate                                      │
│  /api/ai/epics/decompose                                        │
│  /api/ai/stories/generate                                       │
│  /api/ai/roadmap/schedule                                       │
└──────┬────────────────────────────┬───────────────────┬─────────┘
       │                            │                   │
┌──────▼──────┐           ┌─────────▼───────┐  ┌───────▼────────┐
│  Supabase   │           │   Prisma ORM    │  │  Anthropic API │
│             │           │                 │  │                │
│  Auth       │           │  PostgreSQL     │  │  claude-       │
│  Storage    │           │  + pgvector     │  │  sonnet-4-6    │
│  RLS        │           │  + pg_trgm      │  │  Streaming     │
└─────────────┘           └─────────────────┘  └────────────────┘
```

---

## Request Lifecycle

### Standard CRUD request

```
1. Browser → POST /api/features
2. Middleware: updateSession() refreshes Supabase cookie
3. Route handler: getAuthContext() → validates session, resolves user + org
4. Zod validation: parse request body
5. Prisma query: filtered by organizationId (app-level) + RLS (DB-level)
6. AuditLog write
7. Async: fire-and-forget embedding job
8. Return ok(entity, 201)
```

### AI chat request

```
1. Browser → POST /api/ai/chat (with workspaceSession in body)
2. Auth + context: getAuthContext()
3. Resolve/create AIConversation
4. Insert user AIMessage
5. Context assembly (4 layers):
   a. Pinned context: fetch active project, roadmap, recent features
   b. Semantic retrieval: vector search on ai_memories (top-12, re-ranked)
   c. Graph context: 1-2 hop traversal if entity name detected in message
   d. Conversation history: last 8 messages from AIMessage
6. Build messages array for Claude
7. anthropic.messages.stream() → ReadableStream → SSE to browser
8. On stream complete: persist AIMessage, update totalTokens
9. If totalTokens > 8000: enqueue summarization (async)
10. Async: extract knowledge edges from response
```

---

## Multi-Tenancy

All data is scoped to an **Organization**. Isolation is enforced at two layers:

### Layer 1 — Row-Level Security (Database)

Every table has RLS enabled. Policies use `auth.uid()` (set by Supabase on each connection) to verify org membership via the `organization_members` table.

```sql
-- Example: projects table
CREATE POLICY "project_select" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
    )
  );
```

Even if an API route has a bug and omits the `organizationId` filter, the database will not return another tenant's data.

### Layer 2 — Application-level guard (API routes)

`getAuthContext()` resolves the current user's `organizationId` and returns `null` if the user has no membership. Every Prisma query includes `where: { organizationId: auth.organizationId }` as a defense-in-depth measure.

### Service Role Key

Prisma connects using the Supabase **service role key**, which bypasses RLS. This is intentional — server-side code has already authenticated the user via `getAuthContext()`. The anon key is never used server-side.

---

## State Management

| Concern | Solution | Rationale |
|---|---|---|
| Active project / sprint (AI context) | **Zustand** (persisted) | Must survive page navigation; drives every AI call without a network round-trip |
| AI panel open/streaming state | **Zustand** (in-memory) | Pure ephemeral UI state |
| Database entities (features, epics, etc.) | **React Query** | Server state; handles caching, background refetch, optimistic updates |
| Active tab, filter/sort | **URL state (nuqs)** | Shareable, survives refresh, no extra state layer |
| Auth session | **Supabase** (cookie) | Managed by Supabase SSR helpers |

---

## AI Architecture

See [`AI_MEMORY.md`](AI_MEMORY.md) for the full AI memory and context assembly design.

### Key principles

1. **Context is assembled, not retrieved** — the AI never gets a raw database dump. A purpose-built context assembler produces a structured, token-budgeted prompt for every request.

2. **Memory is a first-class entity** — `AIMemory` rows are written on every significant event (feature approved, decision made, epic created). Each row stores the text, the 1536-dim embedding, and rich metadata for hybrid filtering.

3. **Streaming is the UX contract** — all AI responses stream via SSE. First token latency target: under 2 seconds.

4. **Async on writes, sync on reads** — embedding on entity creation is fire-and-forget. AI chat is synchronous + streaming. Conversation summarization is async background.

---

## Folder Architecture Rationale

### `src/app/` — Next.js App Router

Route groups organize concerns:
- `(auth)` — unauthenticated pages (login, register)
- `(workspace)` — authenticated shell with sidebar + AI panel layout
- `api/` — REST endpoints, all server-side only

### `src/lib/` — Server utilities

Shared server-side logic. Nothing in `lib/` should import from `components/` or `stores/`. Key modules:

- `lib/api/auth.ts` — single source of truth for resolving the current user's identity and org membership from a request
- `lib/api/response.ts` — typed response helpers (`ok`, `err`, `Errors`) used by all API routes
- `lib/ai/` — the entire AI pipeline: context assembly, embedding, retrieval, graph traversal, summarization

### `src/stores/` — Zustand

Three stores with narrow, explicit responsibilities. No business logic lives in stores — they are pure state containers.

### `src/hooks/` — React Query wrappers

Every entity has a corresponding hook file (`use-projects.ts`, `use-features.ts`, etc.) that encapsulates all fetch/mutate logic. Components never call `fetch` directly.

---

## v1 → v2 Migration Path

v1 uses Next.js API routes for all backend logic. This is appropriate for a small team moving fast. The migration path to NestJS is defined by these triggers:

| Trigger | Migration |
|---|---|
| Async embedding queue is too slow for serverless cold starts | Migrate embedding worker to NestJS + BullMQ |
| Conversation summarization needs reliable retry/scheduling | Migrate summarization job to NestJS + BullMQ |
| AI generation requests time out at Vercel's 60s function limit | Migrate bulk generation to NestJS streaming endpoint |
| Team grows past 3 engineers | Add NestJS for testability (unit + integration tests on services) |

The Prisma schema, RLS policies, and all business logic are designed to be portable — the API route handlers are thin wrappers around `lib/` functions that can be re-used as NestJS service methods with minimal changes.

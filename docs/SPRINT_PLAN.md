# Sprint Plan

All sprints are 2-week iterations. Capacity assumes 1 full-stack developer (the AI-assisted build model). Stories are ordered within each sprint by dependency — complete top-to-bottom.

---

## Sprint 1 — Foundation ✅ Complete

**Goal:** Working Next.js application with auth, multi-tenancy, project CRUD, and the complete database schema deployed.

**Deliverables:**

| # | Deliverable | Status |
|---|---|---|
| 1.1 | Next.js 15 project scaffold (App Router, TypeScript strict, Tailwind) | ✅ |
| 1.2 | Prisma schema — all 13 models, all enums, all indexes | ✅ |
| 1.3 | Migration SQL — pgvector, pg_trgm, HNSW index, RLS policies for all tables | ✅ |
| 1.4 | Supabase Auth (login, register, session refresh middleware) | ✅ |
| 1.5 | Auth callback — upserts User, creates default Organization + OWNER membership | ✅ |
| 1.6 | `getAuthContext()` — session → user → org resolver | ✅ |
| 1.7 | API response helpers (`ok`, `err`, `Errors.*`) | ✅ |
| 1.8 | Projects API (CRUD) with AuditLog writes | ✅ |
| 1.9 | Projects UI — list, new project form, project detail page | ✅ |
| 1.10 | Workspace shell — sidebar (collapsible), AI panel (stub), layout | ✅ |
| 1.11 | Zustand stores — WorkspaceSession, AIAssistant, UI | ✅ |
| 1.12 | React Query setup + `use-projects.ts` hooks | ✅ |
| 1.13 | Stub pages for Features, Epics, Roadmap, AI Memory | ✅ |
| 1.14 | Documentation (README, CONTRIBUTING, ARCHITECTURE, DATABASE, AI_MEMORY, API, PRODUCT_VISION, SPRINT_PLAN) | ✅ |

**Acceptance Criteria:**
- [ ] A new user can register, complete auth callback, and land on `/` with an auto-created organization
- [ ] User can create a project and see it in the project list
- [ ] Project detail page shows feature/epic counts
- [ ] Sidebar reflects active project in Zustand
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes with zero errors

---

## Sprint 2 — Features + Epics + Stories

**Goal:** Full CRUD for Features, Epics, and User Stories with rich UI, status workflows, and audit logging.

**Deliverables:**

| # | Deliverable |
|---|---|
| 2.1 | Features API (`/api/features`, `/api/features/[id]`) — full CRUD + status transitions |
| 2.2 | Epics API (`/api/epics`, `/api/epics/[id]`) — full CRUD |
| 2.3 | User Stories API (`/api/stories`, `/api/stories/[id]`) with acceptance criteria |
| 2.4 | React Query hooks — `use-features.ts`, `use-epics.ts`, `use-stories.ts` |
| 2.5 | Features page — filterable/sortable table (status, priority, source), status badge, business value bar |
| 2.6 | Feature detail drawer — description, status workflow buttons, notes, metadata |
| 2.7 | New Feature form — title, description, priority, source, businessValue slider, requestedBy |
| 2.8 | Epics page — list grouped by feature, status badges, story count |
| 2.9 | Epic detail view — description, story list, story points total |
| 2.10 | New Epic form |
| 2.11 | User Story card — persona/action/benefit format, acceptance criteria checklist, story points |
| 2.12 | New Story form with AC dynamic list |
| 2.13 | Drag-and-drop story reordering within an epic |
| 2.14 | AuditLog writes on all state transitions |

**Acceptance Criteria:**
- [ ] PO can create a feature, approve it, and see AI memory record created in the `ai_memories` table
- [ ] PO can reject a feature with a reason; the decision is stored as `DECISION` memory
- [ ] PO can create an epic under a feature; `contains` knowledge edge created in `knowledge_edges`
- [ ] PO can create a user story with 2+ acceptance criteria
- [ ] All list views support search and status/priority filters
- [ ] All forms validate with Zod; no invalid data reaches the database
- [ ] `typecheck` and `lint` pass

---

## Sprint 3 — AI Foundation

**Goal:** Working AI chat with full 4-layer context assembly, embedding pipeline, and first-run memory wizard.

**Deliverables:**

| # | Deliverable |
|---|---|
| 3.1 | Embedding service — `lib/ai/embed.ts` wrapping Anthropic embeddings API (text-embedding-3-small, 1536 dims) |
| 3.2 | Embedding trigger hooks — fire-and-forget on feature create/update, epic create, story create |
| 3.3 | Context assembler — `lib/ai/context.ts` — Layer 1 (pinned), Layer 2 (semantic), Layer 3 (graph), Layer 4 (history) |
| 3.4 | Semantic retrieval — vector search + composite re-ranking (`0.6 × sim + 0.25 × recency + 0.15 × importance`) |
| 3.5 | Graph traversal — 1-hop + conditional 2-hop for DECISION nodes |
| 3.6 | AI chat API — `POST /api/ai/chat` with SSE streaming |
| 3.7 | SSE client — `useAIChat()` hook that reads the event stream, updates Zustand partial message |
| 3.8 | AI panel UI — message list, streaming cursor, memory chips (which memories were used), user input |
| 3.9 | Conversation persistence — `AIConversation` + `AIMessage` records |
| 3.10 | Conversation summarization — `POST /api/ai/summarize-conversation` (internal), triggered at 8k tokens |
| 3.11 | First-run wizard — 4-step modal on first project creation (Product Context, Vocabulary, Team Norms, Key Decisions) |
| 3.12 | Memory management page — `projects/[id]/memory` — list, search, manual add, delete |
| 3.13 | System prompt builder — `lib/ai/prompts/system.ts` — assembles the full context into a structured prompt |

**Acceptance Criteria:**
- [ ] First message in a new project sends context from the wizard
- [ ] Semantic search returns relevant memories for a given query (manual QA with test data)
- [ ] Graph context appears in assembled prompt when an entity name is in the user's message
- [ ] SSE stream delivers first token in < 2 seconds (measured on a warm Vercel function)
- [ ] Conversation with 10+ turns triggers summarization; old messages are truncated
- [ ] Memory page shows all memories; semantic search returns correct results
- [ ] `typecheck` and `lint` pass

---

## Sprint 4 — AI Generation

**Goal:** AI-powered generation for features, epics, and user stories. PO can brief the AI and get a populated backlog in minutes.

**Deliverables:**

| # | Deliverable |
|---|---|
| 4.1 | Feature generation API — `POST /api/ai/features/generate` |
| 4.2 | Feature generation UI — "Generate from brief" modal on Features page; renders candidate cards with approve/reject per item |
| 4.3 | Epic decomposition API — `POST /api/ai/epics/decompose` |
| 4.4 | Epic decomposition UI — "AI Decompose" button on Feature detail; renders suggested epics for review |
| 4.5 | Story generation API — `POST /api/ai/stories/generate` |
| 4.6 | Story generation UI — "Generate Stories" button on Epic detail; renders story cards for bulk approve |
| 4.7 | Prompt builders — `lib/ai/prompts/features.ts`, `epics.ts`, `stories.ts` with full context injection |
| 4.8 | Bulk approve / bulk reject UI — checkbox select all, confirm creates records |
| 4.9 | Generation history — which stories were AI-generated is tracked in metadata (`source: "AI_GENERATED"`) |
| 4.10 | Knowledge edge extraction — background job parses AI responses for cross-entity references, creates edges with `source="ai"` |

**Acceptance Criteria:**
- [ ] PO can type a brief ("We need better reporting for finance customers") and get 5 candidate features in < 10 seconds
- [ ] PO can approve 3 of the 5; approved features are created in the database with `source=AI_GENERATED`
- [ ] PO can click "Decompose" on any feature and get 3–5 suggested epics
- [ ] PO can generate stories for an epic and bulk-approve them
- [ ] AI-generated stories follow the team norm (Fibonacci points, ≥2 AC) from the memory wizard
- [ ] `typecheck` and `lint` pass

---

## Sprint 5 — Roadmap

**Goal:** Visual phase-based roadmap with AI scheduling assistant.

**Deliverables:**

| # | Deliverable |
|---|---|
| 5.1 | Roadmap API — CRUD for `Roadmap` and `RoadmapItem` |
| 5.2 | Roadmap page — timeline view (horizontal phases, feature cards per phase) |
| 5.3 | Drag-and-drop feature assignment between phases |
| 5.4 | Phase management — add/rename/delete phases |
| 5.5 | AI scheduling API — `POST /api/ai/roadmap/schedule` |
| 5.6 | AI scheduling UI — "AI Schedule" button; inputs: team size, sprint length, start date; outputs: recommended phase assignments with rationale |
| 5.7 | Date constraints — start/end dates on roadmap items, visual timeline bar |
| 5.8 | Roadmap export — PDF/PNG snapshot (html-to-canvas) |
| 5.9 | Feature status sync — roadmap item status mirrors feature status |

**Acceptance Criteria:**
- [ ] PO can create a roadmap, add phases, and assign features to phases
- [ ] Drag-and-drop reordering updates the database without page refresh
- [ ] AI scheduling produces a phase assignment for all unscheduled features in < 15 seconds
- [ ] Roadmap export produces a clean PDF with feature titles, phases, and dates
- [ ] `typecheck` and `lint` pass

---

## Sprint 6 — Polish + Production Readiness

**Goal:** Harden the application for real users. Optimistic updates, error boundaries, loading states, audit log UI, and Vercel deployment.

**Deliverables:**

| # | Deliverable |
|---|---|
| 6.1 | Optimistic updates on all mutating React Query hooks |
| 6.2 | Error boundaries on every route segment (`error.tsx` files) |
| 6.3 | Loading skeletons on all list views and detail views (`loading.tsx`) |
| 6.4 | Toast notifications (react-hot-toast or Sonner) on create/update/delete |
| 6.5 | Audit log UI — `projects/[id]/activity` — timeline of all mutating events |
| 6.6 | Knowledge graph UI — simple graph visualization on Memory page (force-directed, D3 or react-force-graph) |
| 6.7 | Empty states — every list view has an informative empty state with a CTA |
| 6.8 | Mobile viewport audit — every page is usable on a 375px screen |
| 6.9 | Dark mode audit — every component verified in dark mode |
| 6.10 | Vercel production deployment — environment variables, Supabase connection pooling, edge config |
| 6.11 | Rate limiting on AI endpoints — 60 req/min per org (Upstash Redis + `@upstash/ratelimit`) |
| 6.12 | Error monitoring — Sentry integration |
| 6.13 | Analytics — PostHog event tracking on key actions (project created, feature approved, story generated) |

**Acceptance Criteria:**
- [ ] All list views optimistically update on create/delete; no full-page refetch
- [ ] Any API error shows a toast; the user can retry
- [ ] Audit log shows the last 50 events with actor, action, and timestamp
- [ ] Application is deployed to Vercel production URL
- [ ] Lighthouse performance score ≥ 85 on the Projects page
- [ ] No TypeScript errors, no ESLint errors in CI

---

## Future Sprints (v2+)

| Sprint | Theme |
|---|---|
| 7 | Real-time collaboration (Supabase Realtime, presence, conflict resolution) |
| 8 | Jira integration (bidirectional sync via Jira REST API) |
| 9 | Meeting notes ingestion (paste transcript → AI extracts decisions + feature requests) |
| 10 | Sprint tracking (velocity chart, burndown, DoD automation) |
| 11 | Stakeholder portal (read-only views, feature request voting) |
| 12 | NestJS backend migration (async jobs, BullMQ, improved test coverage) |

---

## Definition of Done

A story is done when:

1. Feature works end-to-end in a local dev environment
2. TypeScript compiles with zero errors (`npm run typecheck`)
3. ESLint passes with zero errors (`npm run lint`)
4. No `console.log` statements left in committed code
5. API routes include AuditLog writes for all mutations
6. Loading and error states are handled in the UI
7. Dark mode works correctly for all new UI components
8. Changes are committed on the feature branch and pushed to remote

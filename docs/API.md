# API Reference

All API routes are Next.js App Router handlers under `src/app/api/`. Every route requires an authenticated session (enforced via `getAuthContext()`). All responses use the `ok()` / `err()` helpers defined in `src/lib/api/response.ts`.

---

## Conventions

### Authentication

Every route calls `getAuthContext()` as its first step. If it returns `null`, the route immediately returns `401 Unauthorized`.

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{ "error": "Unauthorized" }
```

### Request / Response Shape

**Success:**
```json
{ "data": <payload> }
```

**Error:**
```json
{ "error": "<message>", "code": "<ERROR_CODE>" }
```

### Standard Error Codes

| HTTP | Code | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Zod validation failed |
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Session valid, but resource belongs to another org |
| 404 | `NOT_FOUND` | Entity doesn't exist (or is in another org) |
| 409 | `CONFLICT` | Slug / unique constraint violation |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

### Multi-Tenancy

Every Prisma query is scoped by `organizationId` resolved from `getAuthContext()`. Database-level RLS provides a second enforcement layer.

---

## Projects

### `GET /api/projects`

Returns all projects belonging to the authenticated user's organization.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "My Product",
      "slug": "my-product",
      "description": "...",
      "type": "WEB_APP",
      "status": "ACTIVE",
      "targetDate": "2025-06-01T00:00:00.000Z",
      "createdAt": "2024-11-01T00:00:00.000Z",
      "updatedAt": "2024-11-01T00:00:00.000Z",
      "_count": { "features": 12, "epics": 7 }
    }
  ]
}
```

---

### `POST /api/projects`

Create a new project.

**Request body:**
```json
{
  "name": "My Product",
  "description": "What the product does",
  "type": "WEB_APP",
  "targetDate": "2025-06-01"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | 1–100 chars |
| `description` | string | | |
| `type` | `ProjectType` enum | ✅ | See Database docs |
| `targetDate` | ISO date string | | |

**Response `201`:** Created project object (same shape as list item).

**Errors:** `409` if slug derived from name already exists in the org.

---

### `GET /api/projects/[id]`

Returns a single project with feature/epic counts.

**Response `200`:** Single project object.
**Errors:** `404` if not found or belongs to another org.

---

### `PATCH /api/projects/[id]`

Partial update. All fields are optional.

**Request body:** Any subset of `{ name, description, type, status, targetDate }`.

**Response `200`:** Updated project object.

---

### `DELETE /api/projects/[id]`

Soft-delete: sets `status = ARCHIVED`. Does not remove database rows.

**Response `200`:** `{ "data": { "id": "..." } }`

---

## Features

### `GET /api/features?projectId=<id>`

List features for a project. `projectId` is required.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `projectId` | string | Required |
| `status` | `FeatureStatus` | Filter by status |
| `priority` | `Priority` | Filter by priority |
| `search` | string | Full-text search on title + description |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cuid",
      "title": "QuickBooks Integration",
      "description": "...",
      "status": "APPROVED",
      "priority": "HIGH",
      "source": "CUSTOMER_REQUEST",
      "businessValue": 85,
      "requestedBy": "Acme Corp",
      "notes": "...",
      "metadata": {},
      "createdAt": "...",
      "updatedAt": "...",
      "_count": { "epics": 3 }
    }
  ]
}
```

---

### `POST /api/features`

Create a feature.

**Request body:**
```json
{
  "projectId": "cuid",
  "title": "QuickBooks Integration",
  "description": "...",
  "priority": "HIGH",
  "source": "CUSTOMER_REQUEST",
  "businessValue": 85,
  "requestedBy": "Acme Corp"
}
```

| Field | Type | Required |
|---|---|---|
| `projectId` | string | ✅ |
| `title` | string | ✅ |
| `description` | string | |
| `priority` | `Priority` enum | |
| `source` | `FeatureSource` enum | |
| `businessValue` | number 0–100 | |
| `requestedBy` | string | |
| `notes` | string | |
| `metadata` | object | |

**Response `201`:** Created feature. Also fires async embedding job.

---

### `GET /api/features/[id]`

Single feature with epics and their user story counts.

**Response `200`:**
```json
{
  "data": {
    "id": "...",
    "title": "...",
    "epics": [
      { "id": "...", "title": "...", "_count": { "userStories": 5 } }
    ]
  }
}
```

---

### `PATCH /api/features/[id]`

Partial update. Status transitions trigger AI memory writes.

**Notable side effects on status change:**
- `APPROVED` → writes `ENTITY_SUMMARY` memory: `"Feature '[title]' approved..."`
- `REJECTED` or `DEFERRED` → writes `DECISION` memory: `"Feature '[title]' was rejected/deferred. Reason: [notes]"`

---

### `DELETE /api/features/[id]`

Hard delete. Cascades to epics and user stories per Prisma schema.

**Response `200`:** `{ "data": { "id": "..." } }`

---

## Epics

### `GET /api/epics?featureId=<id>`

List epics for a feature.

**Response `200`:** Array of epic objects with `_count.userStories`.

---

### `POST /api/epics`

Create an epic under a feature.

**Request body:**
```json
{
  "featureId": "cuid",
  "title": "OAuth Flow",
  "description": "...",
  "priority": "HIGH",
  "estimatedPoints": 21
}
```

**Response `201`:** Created epic. Also creates `contains` knowledge edge (`feature → epic`) and fires embedding job.

---

### `GET /api/epics/[id]`

Single epic with user stories.

---

### `PATCH /api/epics/[id]`

Partial update.

---

### `DELETE /api/epics/[id]`

Hard delete. Cascades to user stories and acceptance criteria.

---

## User Stories

### `GET /api/stories?epicId=<id>`

List user stories for an epic.

**Response `200`:** Array of story objects with acceptance criteria.

---

### `POST /api/stories`

Create a user story.

**Request body:**
```json
{
  "epicId": "cuid",
  "persona": "Finance Manager",
  "action": "export transaction history",
  "benefit": "reconcile accounts without manual work",
  "acceptanceCriteria": [
    "Given I am on the Reports page, when I click Export, then a CSV downloads",
    "The CSV includes all transactions from the selected date range"
  ],
  "storyPoints": 5,
  "priority": "HIGH"
}
```

**Response `201`:** Created story with acceptance criteria. Also fires embedding job.

---

### `GET /api/stories/[id]`

Single story with full acceptance criteria array.

---

### `PATCH /api/stories/[id]`

Partial update. `acceptanceCriteria` replaces the full array (delete + re-create in a transaction).

---

### `DELETE /api/stories/[id]`

Hard delete with acceptance criteria cascade.

---

## Roadmaps

### `GET /api/roadmaps?projectId=<id>`

List roadmaps for a project.

---

### `POST /api/roadmaps`

Create a roadmap with optional initial phases.

**Request body:**
```json
{
  "projectId": "cuid",
  "title": "2025 Roadmap",
  "description": "...",
  "items": [
    {
      "featureId": "cuid",
      "phase": "Q1 2025",
      "startDate": "2025-01-01",
      "endDate": "2025-03-31",
      "order": 1
    }
  ]
}
```

---

### `GET /api/roadmaps/[id]`

Roadmap with all items (features with title + status).

---

### `PATCH /api/roadmaps/[id]`

Update roadmap title / description or reorder/reassign items.

---

### `DELETE /api/roadmaps/[id]`

Hard delete. Does not delete the underlying features.

---

## AI — Chat

### `POST /api/ai/chat`

The primary AI chat endpoint. Streams a response via SSE.

**Request body:**
```json
{
  "message": "What features should I prioritize this sprint?",
  "conversationId": "cuid | null",
  "workspaceSession": {
    "activeProjectId": "cuid",
    "activeRoadmapId": "cuid | null",
    "activeSprint": "Sprint 3 | null",
    "activeEpicId": "cuid | null"
  }
}
```

**Response:** `text/event-stream`

```
data: {"type":"delta","content":"Based on your"}
data: {"type":"delta","content":" current roadmap..."}
data: {"type":"done","conversationId":"cuid","usedMemoryIds":["id1","id2"]}
```

Event types:

| Type | Fields | Notes |
|---|---|---|
| `delta` | `content: string` | Streamed token chunk |
| `done` | `conversationId`, `usedMemoryIds` | Final event; client updates Zustand |
| `error` | `message: string` | Stream-level error |

**Side effects (after stream completes):**
- Persists `AIMessage` with `role=ASSISTANT`, `content`, `inputTokens`, `outputTokens`
- Updates `AIConversation.totalTokens`
- If `totalTokens > 8000`: enqueues summarization (fire-and-forget)
- Extracts knowledge edges from response (async)

---

## AI — Feature Generation

### `POST /api/ai/features/generate`

Generate a list of candidate features from a natural language brief.

**Request body:**
```json
{
  "projectId": "cuid",
  "brief": "We need better reporting for our finance customers",
  "count": 5
}
```

**Response `200`:**
```json
{
  "data": {
    "features": [
      {
        "title": "Financial Report Builder",
        "description": "...",
        "priority": "HIGH",
        "businessValue": 80,
        "source": "AI_GENERATED"
      }
    ]
  }
}
```

These are suggestions only — the PO reviews and creates actual Feature records via `POST /api/features`.

---

## AI — Epic Decomposition

### `POST /api/ai/epics/decompose`

Decompose a feature into a structured set of epics.

**Request body:**
```json
{
  "featureId": "cuid",
  "context": "optional additional context"
}
```

**Response `200`:**
```json
{
  "data": {
    "epics": [
      {
        "title": "OAuth 2.0 Integration",
        "description": "...",
        "estimatedPoints": 13
      }
    ]
  }
}
```

---

## AI — Story Generation

### `POST /api/ai/stories/generate`

Generate user stories for an epic.

**Request body:**
```json
{
  "epicId": "cuid",
  "count": 5
}
```

**Response `200`:**
```json
{
  "data": {
    "stories": [
      {
        "persona": "Finance Manager",
        "action": "connect my QuickBooks account",
        "benefit": "data syncs automatically",
        "acceptanceCriteria": ["...", "..."],
        "storyPoints": 3
      }
    ]
  }
}
```

---

## AI — Roadmap Scheduling

### `POST /api/ai/roadmap/schedule`

AI-assisted sprint/phase assignment for a set of features.

**Request body:**
```json
{
  "projectId": "cuid",
  "roadmapId": "cuid",
  "featureIds": ["cuid1", "cuid2"],
  "constraints": {
    "teamSize": 4,
    "sprintLengthWeeks": 2,
    "startDate": "2025-01-06"
  }
}
```

**Response `200`:**
```json
{
  "data": {
    "schedule": [
      {
        "featureId": "cuid1",
        "phase": "Sprint 1",
        "startDate": "2025-01-06",
        "endDate": "2025-01-17",
        "rationale": "High business value, no dependencies"
      }
    ]
  }
}
```

---

## AI — Memory

### `GET /api/ai/memory`

List AI memories with optional filters.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `projectId` | string | Filter to a project |
| `type` | `MemoryType` | Filter by memory type |
| `q` | string | Full-text search (uses pg_trgm GIN index) |

**Response `200`:** Array of `AIMemory` objects (without embedding vector).

---

### `POST /api/ai/memory`

Manually add a memory.

**Request body:**
```json
{
  "projectId": "cuid",
  "content": "We decided to use Stripe for payments because...",
  "type": "DECISION",
  "importance": 0.9
}
```

**Response `201`:** Created memory. Embedding runs async.

---

### `DELETE /api/ai/memory/[id]`

Remove a memory.

**Response `200`:** `{ "data": { "id": "..." } }`

---

### `POST /api/ai/memory/[id]/refresh`

Re-embed the memory content (useful after manual content edits).

**Response `200`:** Updated memory row.

---

### `POST /api/ai/memory/search`

Semantic search over memories (used by the Memory Management UI).

**Request body:**
```json
{
  "projectId": "cuid",
  "query": "decisions about mobile apps",
  "limit": 10
}
```

**Response `200`:**
```json
{
  "data": [
    {
      "id": "cuid",
      "content": "We decided NOT to build native mobile apps...",
      "type": "DECISION",
      "similarity": 0.91,
      "importance": 0.9,
      "createdAt": "..."
    }
  ]
}
```

---

## AI — Conversation Summarization (internal)

### `POST /api/ai/summarize-conversation`

**Internal only — not called directly by the client.** Triggered fire-and-forget by `/api/ai/chat` when `totalTokens > 8000`.

**Request body:**
```json
{ "conversationId": "cuid" }
```

**Side effects:**
- Calls Claude with full message history + summarization prompt
- Stores `CONVERSATION_SUMMARY` AIMemory with embedding
- Marks `AIConversation.isSummarized = true`
- Optionally truncates messages older than the last 6 turns

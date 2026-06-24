# Database Documentation

**Engine:** PostgreSQL 15+ (hosted on Supabase)
**ORM:** Prisma 6
**Extensions:** `pgvector`, `pg_trgm`

---

## Table of Contents

- [Entity Relationship Overview](#entity-relationship-overview)
- [Models](#models)
- [Enums](#enums)
- [Indexes](#indexes)
- [Row-Level Security](#row-level-security)
- [Migration Notes](#migration-notes)

---

## Entity Relationship Overview

```
Organization
  └── OrganizationMember (User ↔ Organization)
  └── Project
        └── Feature
        │     └── Epic
        │           └── UserStory
        │                 └── AcceptanceCriteria
        └── Roadmap
        │     └── RoadmapItem (→ Feature | Epic)
        └── AIConversation (per User)
              └── AIMessage
  └── AIMemory (vector embeddings)
  └── KnowledgeEdge (polymorphic graph)
  └── AuditLog
```

---

## Models

### User

Maps a Supabase Auth user to an application user record.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Internal primary key |
| `supabaseId` | String | Foreign key to Supabase `auth.users` |
| `email` | String | User email address |
| `fullName` | String | Display name |
| `avatarUrl` | String? | Profile picture URL |
| `timezone` | String | IANA timezone (default: `UTC`) |

**Indexes:** `supabaseId` (unique), `email` (unique)

---

### Organization

A workspace/tenant. Every user belongs to at least one organization (auto-created on first login).

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `slug` | String | URL-safe unique identifier |
| `name` | String | Display name |
| `logoUrl` | String? | Organization logo |

**Indexes:** `slug` (unique)

---

### OrganizationMember

Join table linking users to organizations with a role.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `organizationId` | String | FK → Organization |
| `userId` | String | FK → User |
| `role` | MemberRole | `OWNER` \| `ADMIN` \| `MEMBER` \| `VIEWER` |
| `joinedAt` | DateTime | When the user joined |

**Indexes:** `[organizationId, userId]` (unique), `organizationId`, `userId`

---

### Project

A software product being managed. The primary organizational unit.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `organizationId` | String | FK → Organization |
| `name` | String | Project name (max 80 chars) |
| `slug` | String | URL-safe name (unique within org) |
| `description` | String? | Product description (used in AI context) |
| `status` | ProjectStatus | Current lifecycle status |
| `type` | ProjectType | Type of software product |
| `startDate` | DateTime? | Project start date |
| `targetDate` | DateTime? | Target delivery date |
| `metadata` | Json | Flexible metadata (goals, tech stack, etc.) |

**Indexes:** `[organizationId, slug]` (unique), `organizationId`, `status`

---

### Feature

A product capability, customer request, or work item at the highest level of decomposition.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `projectId` | String | FK → Project |
| `title` | String | Feature title (max 60 chars recommended) |
| `description` | String? | Detailed description |
| `status` | FeatureStatus | Lifecycle status |
| `priority` | FeaturePriority | Business priority |
| `source` | FeatureSource | Origin of the request |
| `businessValue` | Int? | Score 1–100 indicating business value |
| `effort` | Int? | Total story point estimate |
| `requestedBy` | String? | Customer name, ticket ID, or stakeholder |
| `requestedAt` | DateTime? | When the request was made |
| `tags` | String[] | Free-form tags for filtering |
| `aiSummary` | String? | AI-generated one-paragraph summary |
| `metadata` | Json | Flexible additional data |

**Indexes:** `projectId`, `status`, `priority`

---

### Epic

A significant chunk of work within a Feature, typically spanning one or more sprints.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `projectId` | String | FK → Project |
| `featureId` | String? | FK → Feature (nullable — epics can exist without a parent feature) |
| `title` | String | Epic title (verb-noun recommended: "Implement OAuth flow") |
| `description` | String? | What is built and the definition of done |
| `status` | EpicStatus | Lifecycle status |
| `startDate` | DateTime? | Planned start |
| `endDate` | DateTime? | Planned end |
| `progress` | Int | Denormalized 0–100 progress, updated by job |
| `tags` | String[] | Free-form tags |
| `aiSummary` | String? | AI-generated summary |

**Indexes:** `projectId`, `featureId`, `status`

---

### UserStory

An individual development story following the "As a [persona], I want [action] so that [benefit]" format.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `epicId` | String | FK → Epic |
| `title` | String | Story title |
| `persona` | String? | The user type (e.g. "Finance Manager") |
| `action` | String? | What they want to do |
| `benefit` | String? | The business/user value |
| `status` | StoryStatus | Development lifecycle status |
| `type` | StoryType | `USER_STORY` \| `BUG` \| `TASK` \| `SPIKE` \| `CHORE` |
| `storyPoints` | Int? | Estimation in team's chosen scale |
| `priority` | Int | Ordering within the epic (lower = higher priority) |
| `sprint` | String? | Sprint name/number (e.g. "Sprint 14") |
| `assigneeId` | String? | External reference — not a FK (may be a Jira user ID) |
| `externalId` | String? | Jira/Linear ticket ID for sync |
| `tags` | String[] | Free-form tags |
| `notes` | String? | Additional context, blockers, decisions |

**Indexes:** `epicId`, `status`, `sprint`

---

### AcceptanceCriteria

Structured Given/When/Then criteria attached to a UserStory.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `userStoryId` | String | FK → UserStory |
| `description` | String | Human-readable description of the criterion |
| `type` | CriteriaType | `FUNCTIONAL` \| `NON_FUNCTIONAL` \| `EDGE_CASE` \| `SECURITY` \| `PERFORMANCE` |
| `given` | String? | BDD "Given" clause |
| `when` | String? | BDD "When" clause |
| `then` | String? | BDD "Then" clause |
| `isCompleted` | Boolean | Whether this criterion has been verified |
| `sortOrder` | Int | Display ordering within the story |

**Indexes:** `userStoryId`

---

### Roadmap

A timeline view of features and epics across phases or quarters.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `projectId` | String | FK → Project |
| `title` | String | Roadmap name (e.g. "2025 Product Roadmap") |
| `description` | String? | Purpose and audience |
| `status` | RoadmapStatus | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| `startDate` | DateTime | Roadmap start |
| `endDate` | DateTime | Roadmap end |
| `phases` | Json | Array of `{ name, startDate, endDate, theme }` objects |

**Indexes:** `projectId`

---

### RoadmapItem

A Feature or Epic placed at a specific position on a Roadmap.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `roadmapId` | String | FK → Roadmap |
| `featureId` | String? | FK → Feature (nullable) |
| `epicId` | String? | Epic ID reference (no FK — avoid circular complexity) |
| `type` | RoadmapItemType | `FEATURE` \| `EPIC` \| `MILESTONE` |
| `phase` | String | Name of the phase this item belongs to |
| `startDate` | DateTime? | Visual start on the timeline |
| `endDate` | DateTime? | Visual end on the timeline |
| `laneIndex` | Int | Swim lane position (for parallel work streams) |
| `notes` | String? | Additional context |

**Indexes:** `roadmapId`, `featureId`

---

### AIMemory

The vector memory store. Each row is a semantic chunk of text with a 1536-dimensional embedding.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `organizationId` | String | FK → Organization |
| `projectId` | String? | Optional project scope |
| `type` | MemoryType | Category of memory (see Enums) |
| `content` | String | The raw text that was embedded |
| `embedding` | vector(1536)? | pgvector embedding (text-embedding-3-small or equivalent) |
| `metadata` | Json | Rich metadata for hybrid filtering (see below) |
| `entityType` | String? | Linked entity type: `"feature"`, `"epic"`, `"story"`, etc. |
| `entityId` | String? | Linked entity ID |
| `importance` | Float | Score 0.0–1.0 for retrieval ranking (default: 0.5) |
| `lastAccessedAt` | DateTime? | Last time this chunk influenced an AI response |

**Metadata structure:**
```json
{
  "organizationId": "...",
  "projectId": "...",
  "entityType": "feature",
  "entityId": "...",
  "status": "APPROVED",
  "priority": "HIGH",
  "sprint": "Sprint 14",
  "phase": "Q2 2025",
  "createdAt": "2025-06-01T...",
  "tags": ["payments", "integration"]
}
```

**Indexes:** `organizationId`, `projectId`, `type`, `[entityType, entityId]`
**Special indexes (raw SQL):**
- HNSW index on `embedding` using `vector_cosine_ops` (m=16, ef_construction=64)
- GIN index on `to_tsvector('english', content)` for full-text search

---

### KnowledgeEdge

A directed edge in the product knowledge graph. Connects any two entities with a typed relationship.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `organizationId` | String | Tenant scope |
| `projectId` | String? | Optional project scope |
| `relation` | String | Edge type: `contains`, `depends_on`, `derived_from`, `replaces`, `conflicts_with`, `requested_by`, `blocked_by`, `discussed_in`, `related_to` |
| `fromType` | String | Source entity type (e.g. `"feature"`) |
| `fromId` | String | Source entity ID |
| `toType` | String | Target entity type |
| `toId` | String | Target entity ID |
| `rationale` | String? | Human-readable explanation of the relationship |
| `weight` | Float | Traversal priority 0.0–1.0 (user-asserted = 1.0, AI-detected = 0.7) |
| `source` | String | Who created the edge: `"user"`, `"ai"`, `"import"` |

**Indexes:** `[organizationId, projectId]`, `[fromType, fromId]`, `[toType, toId]`, `relation`

---

### AIConversation

A persistent chat session between a user and the AI assistant.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `userId` | String | FK → User |
| `projectId` | String? | Active project at conversation start |
| `title` | String? | Auto-generated from first user message |
| `contextSnapshot` | Json | Snapshot of WorkspaceSession when conversation started |
| `totalTokens` | Int | Running total of input + output tokens |
| `isSummarized` | Boolean | Whether old messages have been summarized into AIMemory |

---

### AIMessage

An individual message within an AIConversation.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `conversationId` | String | FK → AIConversation |
| `role` | MessageRole | `USER` \| `ASSISTANT` \| `SYSTEM` |
| `content` | String | Full message text |
| `toolCalls` | Json? | Structured tool call results (for future tool-use features) |
| `memoryChunkIds` | String[] | IDs of AIMemory rows retrieved for this turn |
| `model` | String? | Claude model ID used |
| `inputTokens` | Int? | Input token count (for cost tracking) |
| `outputTokens` | Int? | Output token count (for cost tracking) |

---

### AuditLog

Immutable change log. Written on every create, update, status change, and AI generation event.

| Field | Type | Description |
|---|---|---|
| `id` | String | Primary key |
| `organizationId` | String | Tenant scope |
| `projectId` | String? | Project context |
| `userId` | String? | User who made the change (null = system/AI) |
| `action` | AuditAction | Type of change |
| `entityType` | String | Type of entity that changed (e.g. `"feature"`) |
| `entityId` | String | ID of the entity that changed |
| `diff` | Json | `{ before: {...}, after: {...} }` — full field diff |
| `ipAddress` | String? | Client IP |
| `userAgent` | String? | Browser/client user agent |

**Indexes:** `organizationId`, `projectId`, `[entityType, entityId]`, `userId`, `createdAt`

---

## Enums

| Enum | Values |
|---|---|
| `MemberRole` | `OWNER`, `ADMIN`, `MEMBER`, `VIEWER` |
| `ProjectStatus` | `DRAFT`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED` |
| `ProjectType` | `WEB_APP`, `MOBILE_APP`, `API`, `DATA_PLATFORM`, `INTERNAL_TOOL`, `OTHER` |
| `FeatureStatus` | `PROPOSED`, `UNDER_REVIEW`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `DEFERRED` |
| `FeaturePriority` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `ICEBOX` |
| `FeatureSource` | `CUSTOMER_REQUEST`, `INTERNAL`, `MARKET_RESEARCH`, `REGULATORY`, `TECHNICAL_DEBT`, `COMPETITOR_ANALYSIS`, `USER_FEEDBACK`, `SUPPORT_TICKET` |
| `EpicStatus` | `BACKLOG`, `PLANNED`, `IN_PROGRESS`, `DONE`, `CANCELLED` |
| `StoryStatus` | `DRAFT`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`, `CANCELLED` |
| `StoryType` | `USER_STORY`, `BUG`, `TASK`, `SPIKE`, `CHORE` |
| `CriteriaType` | `FUNCTIONAL`, `NON_FUNCTIONAL`, `EDGE_CASE`, `SECURITY`, `PERFORMANCE` |
| `RoadmapStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` |
| `RoadmapItemType` | `FEATURE`, `EPIC`, `MILESTONE` |
| `MemoryType` | `PRODUCT_CONTEXT`, `TEAM_NORM`, `VOCABULARY`, `DECISION`, `CONSTRAINT`, `STAKEHOLDER`, `MEETING_NOTE`, `ENTITY_SUMMARY`, `CONVERSATION_SUMMARY` |
| `MessageRole` | `USER`, `ASSISTANT`, `SYSTEM` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `MEMBER_ADDED`, `MEMBER_REMOVED`, `AI_GENERATED` |

---

## Indexes

| Table | Index | Type | Purpose |
|---|---|---|---|
| `ai_memories` | `embedding` | HNSW (cosine) | Fast approximate nearest-neighbour vector search |
| `ai_memories` | `content` | GIN (tsvector) | Full-text search on memory content |
| `features` | `project_id` | B-tree | List features by project |
| `features` | `status` | B-tree | Filter by status |
| `epics` | `feature_id` | B-tree | List epics by feature |
| `user_stories` | `epic_id` | B-tree | List stories by epic |
| `user_stories` | `sprint` | B-tree | Filter stories by sprint |
| `knowledge_edges` | `from_type, from_id` | B-tree | Graph traversal from a node |
| `knowledge_edges` | `to_type, to_id` | B-tree | Graph traversal to a node |
| `audit_logs` | `entity_type, entity_id` | B-tree | Fetch change history for an entity |
| `audit_logs` | `created_at` | B-tree | Time-range queries on change history |

---

## Row-Level Security

All 13 tables have RLS enabled. Policies are defined in `prisma/migrations/20240101000000_init/migration.sql`.

The access model:

```
OWNER / ADMIN   → Full read + write on all tables in their org
MEMBER          → Full read + write on all tables in their org
VIEWER          → Read-only on all tables in their org
```

AI conversations and messages are additionally scoped to the individual user — a member cannot read another member's conversations.

---

## Migration Notes

### Running migrations

```bash
# Development: create and apply a migration
npm run db:migrate

# Production: apply pending migrations
npx prisma migrate deploy

# After schema changes, regenerate the Prisma client
npm run db:generate
```

### pgvector setup

pgvector and the HNSW index cannot be created via Prisma's migration system. They must be applied via raw SQL **after** the Prisma migration runs:

```sql
-- Run once on a new database
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS ai_memory_embedding_hnsw_idx
  ON ai_memories USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS ai_memory_content_gin_idx
  ON ai_memories USING GIN (to_tsvector('english', content));
```

On Supabase, these can be run from the **SQL Editor** in the dashboard.

### Adding a new model

1. Add the model to `prisma/schema.prisma`
2. Run `npm run db:migrate` with a descriptive name
3. Add RLS policies to the migration SQL file
4. Add `organizationId` filter to all API routes that touch the new table
5. Add an `AuditLog` write to all mutating operations

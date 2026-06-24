# AI Memory System

The AI memory system is the core differentiator of ProductPilot AI. It gives Claude persistent, structured knowledge about your product — so every conversation is contextually grounded, not generic.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Every AI Request                             │
│                                                                 │
│  User message                                                   │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │           Context Assembler (4 layers)                 │     │
│  │                                                        │     │
│  │  Layer 1 — Pinned Context         ~800 tokens          │     │
│  │  Layer 2 — Semantic Memory       ~1200 tokens          │     │
│  │  Layer 3 — Graph Context          ~600 tokens          │     │
│  │  Layer 4 — Conversation History  ~1000 tokens          │     │
│  │                                  ─────────────         │     │
│  │  Total target                    ~3600 tokens          │     │
│  └────────────────────────────────────────────────────────┘     │
│       │                                                         │
│       ▼                                                         │
│  Claude (claude-sonnet-4-6) → SSE stream → UI                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Gets Embedded

Every piece of content that could later answer a natural language question is embedded as a semantic chunk. The unit of embedding is **never** a raw database row — always a human-readable sentence or paragraph.

| Trigger | Text Constructed | MemoryType | Importance |
|---|---|---|---|
| Project created/updated | `"Project [name]: [description]. Type: [type]. Goals: [metadata.goals]"` | `PRODUCT_CONTEXT` | 1.0 |
| Feature approved | `"Feature '[title]' approved. Priority: [priority]. Source: [source]. Requested by [requestedBy]. Business value: [score]/100."` | `ENTITY_SUMMARY` | 0.8 |
| Feature rejected/deferred | `"Feature '[title]' was [rejected/deferred]. Reason: [notes]"` | `DECISION` | 0.9 |
| Epic created | `"Epic '[title]' breaks down feature '[feature.title]'. [description]."` | `ENTITY_SUMMARY` | 0.7 |
| User story created | `"Story: As a [persona], I want [action] so that [benefit]. Epic: [epic.title]. Points: [sp]."` | `ENTITY_SUMMARY` | 0.6 |
| First-run wizard — vocabulary | Each term: `"[term] = [definition]"` | `VOCABULARY` | 0.9 |
| First-run wizard — team norms | Each norm: `"[norm description]"` | `TEAM_NORM` | 0.85 |
| First-run wizard — decisions | Each decision: `"We decided [decision] because [rationale]"` | `DECISION` | 0.9 |
| Conversation summarized | AI-generated paragraph summary | `CONVERSATION_SUMMARY` | 0.75 |
| Knowledge edge with rationale | `"[fromType] '[title]' [relation] [toType] '[title]'. Rationale: [rationale]"` | `DECISION` | 0.9 |

**What is NOT embedded:** raw JSON metadata, individual acceptance criteria (covered by the parent story text), audit log diffs, system-generated fields.

---

## Context Assembly — 4 Layers

### Layer 1 — Pinned Context (~800 tokens)

Always included. Zero vector computation. Fetched synchronously from Postgres using the `WorkspaceSession` from the request body.

```typescript
interface PinnedContext {
  project: { name, description, type, status, targetDate };
  activeRoadmap: { title, currentPhase, phases };
  recentFeatures: Feature[];  // last 5 by updatedAt
  activeSprint?: string;       // from WorkspaceSession
}
```

This layer ensures the AI always knows what product it's working on, even on the very first message.

### Layer 2 — Semantic Memory (~1,200 tokens)

Cosine similarity search on `ai_memories`, filtered by `organization_id` and optionally `project_id`. Returns top-12 chunks by a composite score:

```
finalScore = (0.6 × cosineSimilarity)
           + (0.25 × recencyScore)
           + (0.15 × importanceScore)

recencyScore = 1 / (1 + daysSinceCreated / 30)
importanceScore = ai_memories.importance  (stored field, 0.0–1.0)
```

SQL query pattern:
```sql
SELECT content, metadata, 1 - (embedding <=> $queryEmbedding) AS similarity
FROM ai_memories
WHERE organization_id = $orgId
  AND ($projectId IS NULL OR project_id = $projectId)
ORDER BY embedding <=> $queryEmbedding
LIMIT 30;
-- Re-rank top-30 by composite score, return top-12
```

### Layer 3 — Graph Context (~600 tokens, conditional)

Only assembled when an entity name is detected in the user's message. Uses a cached entity name index (loaded on project open) to detect mentions.

**Process:**
1. Detect entity names in message (string match against cached list)
2. Fetch 1-hop neighbors from `knowledge_edges`
3. If a `DECISION` node is found, fetch its neighbors too (2-hop)
4. Format neighbors as a structured narrative

**Output example:**
```
Graph context for "QuickBooks integration":
- [decision] Approved 2024-11-15. Rationale: "Finance team spends 4h/week on manual exports."
- [requested_by] Customer "Acme Corp" ticket #SUP-4421 requested this feature.
- [discussed_in] Meeting 2024-10-30: "Chose QBO over Xero — 80% of customers use it."
- [blocks] Epic "Financial Reporting" depends on this feature.
```

### Layer 4 — Recent Conversation (~1,000 tokens)

Last 8 messages from `ai_messages` for the active `AIConversation`. Trimmed from the oldest end if over the token budget.

---

## Context Window Budget

| Layer | Target Tokens | Hard Cap |
|---|---|---|
| System prompt header | ~200 | 300 |
| Layer 1 — Pinned context | ~800 | 1,000 |
| Layer 2 — Semantic memory | ~1,200 | 1,500 |
| Layer 3 — Graph context | ~600 | 800 |
| Layer 4 — Conversation history | ~1,000 | 1,200 |
| **Total context** | **~3,800** | **4,800** |
| Claude's response budget | ~2,048 | 4,096 |
| **Total window used** | **~5,848** | — |
| Claude's window (claude-sonnet-4-6) | 200,000 | — |

This leaves 194K+ tokens of headroom. We deliberately keep context tight to:
1. Reduce latency (fewer tokens = faster first token)
2. Reduce cost per request
3. Force high-quality retrieval (better to retrieve precisely than dump everything)

---

## Chunking Strategy

Long content is split before embedding to improve retrieval precision.

- **Max chunk size:** 512 tokens
- **Overlap:** 64 tokens between consecutive chunks from the same entity
- **Split boundary:** Sentence boundaries (not mid-word or mid-sentence)
- **Metadata inheritance:** Each chunk inherits the full metadata of its parent entity

A feature with a 1,500-token description produces 3 chunks:
- Chunk 1: tokens 0–512
- Chunk 2: tokens 448–960 (64-token overlap)
- Chunk 3: tokens 896–1408 (64-token overlap)

All three chunks share the same `entityType`, `entityId`, and metadata, so graph context fetches work correctly even when only part of the description was retrieved.

---

## Conversation Summarization

**Trigger:** `AIConversation.totalTokens > 8,000`

**Process:**
1. API route detects the threshold after saving the latest message
2. Enqueues a summarization job (fire-and-forget via `fetch` to `/api/ai/summarize-conversation`)
3. Summarization job calls Claude with the full message history and a summarization prompt
4. Summary is stored as a `CONVERSATION_SUMMARY` AIMemory row (with embedding)
5. Old messages beyond the last 6 turns are optionally truncated
6. `AIConversation.isSummarized = true`

The user never waits for summarization — it runs entirely in the background.

**Eviction order** (when context budget is exceeded):
1. Oldest `ENTITY_SUMMARY` memories beyond the top-12 retrieval window
2. `CONVERSATION_SUMMARY` memories older than 30 days with `importance < 0.3`
3. Conversation history beyond the last 8 turns

---

## First-Run Memory Setup Wizard

When a PO creates a new project, they complete a 4-step wizard before the workspace loads. Each step writes directly to `ai_memories`.

### Step 1 — Product Context (required)

```
Prompt: "What is [ProjectName]? Describe the product, its users,
         and its core value proposition."

→ Stored as: MemoryType.PRODUCT_CONTEXT, importance = 1.0
```

### Step 2 — Vocabulary (repeatable)

```
Key-value pairs:
  "MRR" → "Monthly Recurring Revenue"
  "Operator" → "A business that uses our B2B SaaS platform"
  "Slot" → "A 30-minute booking unit in the scheduling system"

→ Each term stored as: MemoryType.VOCABULARY, importance = 0.9
```

### Step 3 — Team Norms (checkboxes + free text)

```
Pre-filled options:
  ✅ "We estimate in Fibonacci points (1, 2, 3, 5, 8, 13)"
  ✅ "Stories must follow the INVEST criteria"
  ✅ "Stories must have ≥2 acceptance criteria before moving to Ready"
  + free text additions

→ Each norm stored as: MemoryType.TEAM_NORM, importance = 0.85
```

### Step 4 — Key Decisions Already Made (optional)

```
Free text:
  "We decided NOT to build native mobile apps because 95% of users
   access via browser on desktop."
  "We chose PostgreSQL over MongoDB because our data is highly relational."

→ Each decision stored as: MemoryType.DECISION, importance = 0.9
```

After the wizard, the AI immediately has full product context and generates contextually accurate outputs from the first message.

---

## Knowledge Graph

### Storage

The knowledge graph is stored as a Postgres adjacency table (`knowledge_edges`). No separate graph database is required in v1.

### Relation Types

| Relation | Meaning | Example |
|---|---|---|
| `contains` | Parent → child (structural) | Feature contains Epic |
| `depends_on` | A cannot start without B | Epic depends_on another Epic |
| `derived_from` | A was created because of B | UserStory derived_from a meeting decision |
| `replaces` | A supersedes B | New Feature replaces an old Feature |
| `conflicts_with` | A and B cannot both be done | Two competing approaches |
| `requested_by` | A was requested by a stakeholder | Feature requested_by a customer |
| `blocked_by` | A is blocked by B | Epic blocked_by an external dependency |
| `discussed_in` | A was discussed in a meeting | Feature discussed_in a meeting note |
| `related_to` | Loose association | Two Features with overlapping scope |

### Edge Creation

**Automatic (server-side, in the same transaction):**
- Epic created under Feature X → `feature contains epic`
- Feature status changed to REJECTED → `feature decision auditLog`

**AI-detected (async, post-response):**
- Background extraction step parses Claude's response for cross-entity references
- Stored with `source="ai"`, `weight=0.7`

**Manual (PO-created):**
- UI allows connecting two entities with a chosen relation type and rationale
- Stored with `source="user"`, `weight=1.0`

### Graph Traversal Query

```sql
-- 1-hop neighbors of a feature
SELECT ke.relation, ke.rationale, ke.to_type, ke.to_id, ke.weight
FROM knowledge_edges ke
WHERE (ke.from_type = 'feature' AND ke.from_id = $featureId)
   OR (ke.to_type = 'feature' AND ke.to_id = $featureId)
ORDER BY ke.weight DESC
LIMIT 20;
```

2-hop expansion is applied selectively when a DECISION or high-weight node is found in the 1-hop results.

---

## AI Memory API

| Endpoint | Method | Description |
|---|---|---|
| `/api/ai/memory` | GET | List memories (with `?q=` text search, `?type=`, `?projectId=`) |
| `/api/ai/memory` | POST | Manually add a memory |
| `/api/ai/memory/[id]` | DELETE | Remove a memory |
| `/api/ai/memory/[id]/refresh` | POST | Re-embed updated content |
| `/api/ai/memory/search` | POST | Semantic search (for the memory management UI) |

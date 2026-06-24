# ProductPilot AI

**AI Workspace for Product Owners**

ProductPilot AI is a production-grade SaaS application that acts as an intelligent second brain for Product Owners and Product Managers working on enterprise software. Unlike traditional project management tools that store information, ProductPilot *understands* information — connecting meetings, decisions, features, sprints, and stakeholders into a living knowledge graph that your AI co-pilot can reason over.

---

## Table of Contents

- [Vision](#vision)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Available Scripts](#available-scripts)
- [Documentation](#documentation)
- [Sprint Roadmap](#sprint-roadmap)
- [Contributing](#contributing)

---

## Vision

> Traditional project management software stores information. ProductPilot understands it.

| Tool | What it does |
|------|-------------|
| Notion | Documentation |
| Jira | Issue tracking |
| Linear | Sprint management |
| Confluence | Knowledge base |
| ChatGPT | AI assistant |
| **ProductPilot AI** | **All of the above, intelligently connected** |

The AI knows what you're working on, why you're working on it, who requested it, which sprint it belongs to, what meeting discussed it, and what should happen next.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | Framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| ShadCN UI | Component library |
| Framer Motion | Animations |
| Zustand | Client state (workspace session, AI panel) |
| TanStack Query v5 | Server state, caching, mutations |
| React Hook Form | Form management |
| Zod | Schema validation |
| nuqs | URL state management |

### Backend
| Technology | Purpose |
|---|---|
| Next.js API Routes | REST API (v1) |
| Prisma ORM | Database access layer |
| PostgreSQL (Supabase) | Primary database |
| pgvector | Vector embeddings for AI memory |
| pg_trgm | Full-text search |

### Auth & Infrastructure
| Technology | Purpose |
|---|---|
| Supabase Auth | Authentication (email/password, OAuth) |
| Supabase Storage | File storage |
| Row-Level Security | Multi-tenant data isolation |

### AI Layer
| Technology | Purpose |
|---|---|
| Anthropic Claude | Primary AI model (`claude-sonnet-4-6`) |
| Anthropic SDK | Streaming, tool use |
| pgvector HNSW index | Approximate nearest-neighbour vector search |

---

## Project Structure

```
productpilot/
├── prisma/
│   ├── schema.prisma                    # Full database schema (13 models)
│   └── migrations/
│       └── 20240101000000_init/
│           └── migration.sql            # pgvector, HNSW index, RLS policies
├── src/
│   ├── app/
│   │   ├── (auth)/                      # Login, register pages
│   │   ├── (workspace)/                 # Authenticated workspace shell
│   │   │   ├── layout.tsx               # Sidebar + AI panel shell
│   │   │   ├── page.tsx                 # Dashboard
│   │   │   └── projects/
│   │   │       ├── page.tsx             # Projects list
│   │   │       ├── new/page.tsx         # Create project
│   │   │       └── [projectId]/         # Project workspace
│   │   │           ├── layout.tsx       # Sets active project in Zustand
│   │   │           ├── page.tsx         # Project overview
│   │   │           ├── features/        # Feature management (Sprint 2)
│   │   │           ├── epics/           # Epic management (Sprint 2)
│   │   │           ├── roadmap/         # Roadmap timeline (Sprint 3)
│   │   │           └── memory/          # AI Memory management (Sprint 3)
│   │   ├── api/
│   │   │   ├── projects/                # Projects CRUD
│   │   │   ├── features/                # Features CRUD + AI generation (Sprint 2)
│   │   │   ├── epics/                   # Epics CRUD + AI decomposition (Sprint 2)
│   │   │   ├── stories/                 # Stories CRUD + AI generation (Sprint 2)
│   │   │   ├── roadmaps/                # Roadmap CRUD + AI scheduling (Sprint 3)
│   │   │   └── ai/                      # AI endpoints (Sprint 3-4)
│   │   │       ├── chat/                # Streaming chat
│   │   │       ├── memory/              # Memory management
│   │   │       ├── features/generate/   # AI feature generation
│   │   │       ├── epics/decompose/     # AI epic decomposition
│   │   │       ├── stories/generate/    # AI story generation
│   │   │       └── roadmap/schedule/    # AI roadmap scheduling
│   │   ├── auth/callback/               # Supabase OAuth callback
│   │   ├── globals.css                  # Global styles + CSS variables
│   │   └── layout.tsx                   # Root layout
│   ├── components/
│   │   ├── ui/                          # ShadCN UI primitives
│   │   ├── auth/                        # Login/register forms
│   │   ├── layout/                      # Sidebar, AI assistant panel
│   │   ├── projects/                    # Project-specific components
│   │   ├── features/                    # Feature components (Sprint 2)
│   │   ├── epics/                       # Epic components (Sprint 2)
│   │   ├── stories/                     # Story components (Sprint 2)
│   │   ├── roadmap/                     # Roadmap components (Sprint 3)
│   │   ├── ai-assistant/                # AI panel components (Sprint 3)
│   │   └── memory/                      # Memory components (Sprint 3)
│   ├── hooks/
│   │   ├── use-projects.ts              # React Query hooks for projects
│   │   ├── use-features.ts              # (Sprint 2)
│   │   ├── use-epics.ts                 # (Sprint 2)
│   │   ├── use-stories.ts               # (Sprint 2)
│   │   └── use-ai-chat.ts               # SSE streaming hook (Sprint 3)
│   ├── lib/
│   │   ├── prisma.ts                    # Prisma singleton
│   │   ├── utils.ts                     # cn(), slugify(), formatDate()
│   │   ├── query-client.ts              # React Query client factory
│   │   ├── api/
│   │   │   ├── auth.ts                  # getAuthContext() — extracts user + org
│   │   │   └── response.ts              # ok(), err(), Errors helpers
│   │   ├── supabase/
│   │   │   ├── client.ts                # Browser Supabase client
│   │   │   ├── server.ts                # Server Supabase client
│   │   │   └── middleware.ts            # Session refresh middleware
│   │   └── ai/                          # AI layer (Sprint 3)
│   │       ├── anthropic.ts             # Anthropic SDK singleton
│   │       ├── context-assembler.ts     # 4-layer context assembly
│   │       ├── embedder.ts              # Text → vector embeddings
│   │       ├── memory-retriever.ts      # Hybrid vector + structured retrieval
│   │       ├── graph-traverser.ts       # Knowledge graph traversal
│   │       ├── entity-detector.ts       # Named entity detection
│   │       └── summarizer.ts            # Conversation summarization
│   ├── stores/
│   │   ├── workspace.store.ts           # Active project, sprint, roadmap
│   │   ├── ai-assistant.store.ts        # AI panel state, streaming
│   │   └── ui.store.ts                  # Sidebar collapsed, theme
│   ├── middleware.ts                    # Route protection + session refresh
│   └── types/                           # Shared TypeScript types (Sprint 2+)
├── docs/
│   ├── ARCHITECTURE.md                  # System architecture deep-dive
│   ├── DATABASE.md                      # Schema documentation
│   ├── AI_MEMORY.md                     # AI memory system design
│   ├── API.md                           # API reference
│   ├── PRODUCT_VISION.md                # Product vision and goals
│   └── SPRINT_PLAN.md                   # Full sprint roadmap
├── .env.example                         # Environment variable template
├── components.json                      # ShadCN UI configuration
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic](https://console.anthropic.com) API key

### 1. Clone and install

```bash
git clone https://github.com/ElinamRobert/pMesh.git
cd pMesh
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in all values — see [Environment Variables](#environment-variables).

### 3. Set up the database

In your Supabase project:

1. Go to **SQL Editor**
2. Run the contents of `prisma/migrations/20240101000000_init/migration.sql` — this enables pgvector, creates the HNSW index, and sets up all RLS policies
3. Then run Prisma migrations:

```bash
npm run db:migrate
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `DATABASE_URL` | ✅ | Postgres connection string (use Transaction pooler for serverless) |
| `DIRECT_URL` | ✅ | Direct Postgres connection (used by Prisma migrations) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key for Claude |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your app URL (e.g. `http://localhost:3000`) |

> **Database URLs:** Use Supabase's **Transaction pooler** (port 6543) for `DATABASE_URL` and the **Direct connection** (port 5432) for `DIRECT_URL`.

---

## Database Setup

Full schema documentation is in [`docs/DATABASE.md`](docs/DATABASE.md).

Quick summary of the 13 models:

| Model | Purpose |
|---|---|
| `User` | Authenticated user (linked to Supabase Auth) |
| `Organization` | Workspace/tenant container |
| `OrganizationMember` | User ↔ Organization membership with roles |
| `Project` | A software product being managed |
| `Feature` | A product capability or customer request |
| `Epic` | A chunk of work within a feature |
| `UserStory` | A development story within an epic |
| `AcceptanceCriteria` | Given/When/Then criteria on a story |
| `Roadmap` | A timeline view across phases/quarters |
| `RoadmapItem` | A feature or epic placed on a roadmap |
| `AIMemory` | Vector-embedded memory chunks (pgvector) |
| `KnowledgeEdge` | Graph connections between any two entities |
| `AIConversation` / `AIMessage` | Persistent AI chat history |
| `AuditLog` | Immutable change log for all entities |

---

## Available Scripts

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run typecheck    # TypeScript type check (no emit)
npm run db:generate  # Regenerate Prisma client
npm run db:push      # Push schema changes to DB (no migration file)
npm run db:migrate   # Create and apply migration
npm run db:studio    # Open Prisma Studio
```

---

## Documentation

| Document | Description |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, data flow, AI pipeline |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Full schema reference with field descriptions |
| [`docs/AI_MEMORY.md`](docs/AI_MEMORY.md) | AI memory system, vector retrieval, context assembly |
| [`docs/API.md`](docs/API.md) | REST API reference for all endpoints |
| [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) | Product vision, target users, v1/v2/v3 scope |
| [`docs/SPRINT_PLAN.md`](docs/SPRINT_PLAN.md) | Detailed sprint plan with acceptance criteria |

---

## Sprint Roadmap

| Sprint | Focus | Status |
|---|---|---|
| **Sprint 1** | Foundation — scaffold, schema, auth, Projects CRUD | ✅ Complete |
| **Sprint 2** | Core hierarchy — Features, Epics, User Stories + CRUD | 🔜 Next |
| **Sprint 3** | AI foundation — memory setup wizard, context assembler, AI chat | 🔜 Planned |
| **Sprint 4** | AI generation — feature/epic/story generation endpoints | 🔜 Planned |
| **Sprint 5** | Roadmap — timeline UI, AI scheduling, memory management UI | 🔜 Planned |
| **Sprint 6** | Polish — optimistic updates, audit log UI, knowledge graph | 🔜 Planned |

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch strategy, commit conventions, and PR process.

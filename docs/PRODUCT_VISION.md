# Product Vision

---

## The Problem

Product Owners in enterprise software teams suffer from **context collapse**. By the time a decision needs to be made or a story needs to be written, the original context — the customer conversation that surfaced the need, the architecture discussion that constrained the approach, the sprint retro that revealed the risk — is scattered across Slack threads, Confluence pages, Jira tickets, and calendar invites. Nothing connects.

The result: POs spend 40–60% of their time reconstructing context that already exists, answering the same questions repeatedly, and writing boilerplate stories that miss the nuance captured three months ago in a meeting no one can find.

---

## The Vision

**ProductPilot AI is an AI operating system for Product Owners.**

It is not a task tracker with an AI assistant bolted on. It is an AI-native workspace where every feature, every decision, every team norm, every stakeholder preference is immediately known to the AI — and can be recalled, applied, and built upon in any conversation.

The core metaphor is a **second brain that gets smarter every day**. When a PO connects a customer request to a feature, approves a roadmap item, or decides to defer a piece of scope, that context is automatically encoded into a persistent, queryable knowledge graph. The next conversation — whether it's generating user stories, scheduling a sprint, or answering "why did we decide X?" — starts fully informed.

---

## Target Users

### Primary: Product Owners in B2B SaaS

- Managing 1–3 products simultaneously
- Working with 2–8 engineering teams
- Backlog of 50–500 features in various states
- Constant pressure to document decisions, justify prioritization, and ship stories fast

### Secondary: Product Managers (consumer / growth)

- Less structured than B2B POs, but same context collapse problem
- Use roadmapping + AI chat more than structured epics/stories

### Out of Scope (v1)

- Engineering teams (no code, no CI/CD, no ticketing sync)
- Executives (no OKR management, no board reporting)
- Design teams (no Figma integration, no design review)

---

## Core Value Propositions

| Value | How It's Delivered |
|---|---|
| **Zero context-switching** | The AI always knows your product — no "give me some context" prompt before every request |
| **Decisions are first-class entities** | Rejected features, architecture choices, and scope decisions are stored in the knowledge graph and recalled automatically |
| **Stories in seconds, not hours** | AI generates complete user stories in your team's vocabulary, following your team norms, grounded in existing decisions |
| **Institutional memory that doesn't leave** | When a PO leaves the team, the knowledge graph stays |

---

## v1 — Foundations (Current Sprint Plan)

**Theme:** Build the core data model, AI memory infrastructure, and the primary PO workflow (Feature → Epic → Story) end-to-end.

**Guiding constraint:** One PO should be able to onboard, describe their product in a wizard, and generate a backlog of user stories from a natural language brief — in under 30 minutes.

### What's in v1

- Multi-tenant project workspace (Organization → Project)
- Feature management (create, prioritize, approve/reject)
- Epic decomposition (manual + AI-assisted)
- User story generation (manual + AI-assisted)
- Roadmap (phase-based, drag-and-drop ordering)
- AI chat with 4-layer context assembly
- AI memory system (embeddings, knowledge graph, first-run wizard)
- Conversation summarization
- Audit log (every mutating event)

### What's NOT in v1

| Capability | Rationale |
|---|---|
| Jira / Linear sync | Integration complexity out of scope; POs export manually |
| Sprint velocity tracking | Requires historical data; add in v2 |
| Meeting notes ingestion | High value but complex parsing; v2 |
| Multi-user collaboration (real-time) | Single PO per workspace in v1; v2 adds presence |
| Native mobile | 95% of POs work on desktop; web-responsive sufficient |
| Custom AI model selection | Claude `claude-sonnet-4-6` is the right default; v2 may add GPT-4o |
| Notification system | Email / Slack alerts deferred to v2 |
| SSO / SAML | Enterprise auth in v2 |

---

## v2 — Team Collaboration

**Theme:** Expand from single-PO to full product team. Add real-time collaboration, integrations, and deeper AI capabilities.

### v2 Additions

- **Real-time collaboration** — multiple POs can edit the same workspace (Supabase Realtime)
- **Jira / Linear bidirectional sync** — features and stories push/pull from existing issue trackers
- **Meeting notes ingestion** — paste or connect calendar + transcripts; AI extracts decisions and feature requests automatically
- **Sprint tracking** — velocity, burndown, definition of done automation
- **Stakeholder portal** — read-only view for execs and customers; feature request voting
- **Notification system** — email digests, Slack alerts on feature status changes
- **Backend migration** — move async jobs (embedding, summarization) to NestJS + BullMQ for reliability
- **SSO / SAML** — enterprise auth for large org deployments

---

## v3 — Intelligence Layer

**Theme:** Move from AI-assisted to AI-driven. The product proactively surfaces insights, flags risks, and suggests next actions without the PO asking.

### v3 Additions

- **Proactive risk detection** — AI monitors the knowledge graph for unresolved dependencies, stale decisions, scope creep signals
- **Auto-prioritization** — AI scores and re-ranks backlog based on customer impact, technical risk, and roadmap constraints
- **Cross-team dependency mapping** — visibility into features that span multiple squads or block other teams
- **Customer feedback loop** — connect Intercom / Zendesk; AI surfaces feature requests from support tickets
- **OKR alignment** — map features to business objectives; AI flags misalignment
- **Predictive scheduling** — AI estimates delivery dates based on team velocity history and story point distributions

---

## Success Metrics (v1)

| Metric | Target |
|---|---|
| Time to first story generated | < 30 minutes from account creation |
| AI response first-token latency | < 2 seconds |
| Story quality (PO-rated 4+/5) | > 80% of AI-generated stories |
| Context recall accuracy | PO rates "AI remembered correctly" > 90% of the time |
| Weekly active usage | PO opens workspace ≥ 3 days/week |

---

## Positioning

**ProductPilot AI is not:**
- A project management tool (Linear, Jira, Asana)
- An AI writing assistant (ChatGPT, Notion AI)
- A requirements management tool (Aha!, ProductPlan)

**ProductPilot AI is:**
> The persistent AI layer between a Product Owner's mind and their backlog — a workspace that remembers everything, connects everything, and generates everything grounded in the actual product.

---

## Design Principles

1. **AI-native, not AI-bolted-on** — the AI memory system is built into the data model from day one, not added as a plugin
2. **Context over convenience** — better to retrieve 12 highly relevant memories than dump 200 rows into the prompt
3. **Decisions are permanent** — rejected features and past decisions are never deleted; they inform every future conversation
4. **PO-speed UX** — every generation action must complete in under 10 seconds; no loading spinners longer than that
5. **Dark mode default** — POs work late; the default theme is dark

import { prisma } from "@/lib/prisma";
import { embed, buildNodeText } from "./embed";

interface UpsertMemoryInput {
  organizationId: string;
  projectId: string;
  entityType: "feature" | "epic" | "story";
  entityId: string;
  title: string;
  description?: string | null;
  persona?: string | null;
  action?: string | null;
  benefit?: string | null;
}

/**
 * Creates or updates an AIMemory record with a fresh embedding.
 * Fire-and-forget safe — callers catch errors.
 */
export async function upsertKnowledgeNode(
  input: UpsertMemoryInput
): Promise<void> {
  const text = buildNodeText(input.entityType, {
    title: input.title,
    description: input.description,
    persona: input.persona,
    action: input.action,
    benefit: input.benefit,
  });

  const embedding = await embed(text);
  const vector = `[${embedding.join(",")}]`;

  // Upsert via raw SQL to handle the vector column (Prisma Unsupported type)
  await prisma.$executeRaw`
    INSERT INTO ai_memories (
      id, organization_id, project_id, type, content,
      embedding, entity_type, entity_id, importance,
      metadata, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      ${input.organizationId}::text,
      ${input.projectId}::text,
      'ENTITY_SUMMARY'::"MemoryType",
      ${text},
      ${vector}::vector,
      ${input.entityType},
      ${input.entityId},
      0.5,
      '{}',
      now(),
      now()
    )
    ON CONFLICT (entity_id) DO UPDATE SET
      content = EXCLUDED.content,
      embedding = EXCLUDED.embedding,
      updated_at = now()
  `;
}

/**
 * Semantic search via cosine distance on the vector column.
 * Composite score: 0.6×similarity + 0.25×recency(normalized) + 0.15×importance
 */
export async function semanticSearch(params: {
  organizationId: string;
  projectId: string;
  queryEmbedding: number[];
  topK?: number;
}): Promise<
  Array<{
    id: string;
    entityType: string | null;
    entityId: string | null;
    content: string;
    importance: number;
    score: number;
  }>
> {
  const { organizationId, projectId, queryEmbedding, topK = 8 } = params;
  const vector = `[${queryEmbedding.join(",")}]`;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      entity_type: string | null;
      entity_id: string | null;
      content: string;
      importance: number;
      score: number;
    }>
  >`
    SELECT
      id,
      entity_type,
      entity_id,
      content,
      importance,
      (
        0.6 * (1 - (embedding <=> ${vector}::vector)) +
        0.25 * GREATEST(0, 1 - EXTRACT(EPOCH FROM (now() - updated_at)) / (86400.0 * 30)) +
        0.15 * importance
      ) AS score
    FROM ai_memories
    WHERE organization_id = ${organizationId}
      AND project_id = ${projectId}
      AND embedding IS NOT NULL
    ORDER BY score DESC
    LIMIT ${topK}
  `;

  return rows.map((r) => ({
    id: r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    content: r.content,
    importance: Number(r.importance),
    score: Number(r.score),
  }));
}

/**
 * Graph traversal: fetch 1-hop KnowledgeEdge neighbors of given entity IDs.
 */
export async function getGraphNeighbors(params: {
  organizationId: string;
  entityIds: string[];
}): Promise<
  Array<{
    fromId: string;
    toId: string;
    relation: string;
  }>
> {
  const { organizationId, entityIds } = params;
  if (entityIds.length === 0) return [];

  const edges = await prisma.knowledgeEdge.findMany({
    where: {
      organizationId,
      OR: [{ fromId: { in: entityIds } }, { toId: { in: entityIds } }],
    },
    take: 20,
  });

  return edges.map((e) => ({
    fromId: e.fromId,
    toId: e.toId,
    relation: e.relation,
  }));
}

import { prisma } from "@/lib/prisma";
import { embed } from "./embed";
import { semanticSearch, getGraphNeighbors } from "./memory";

export interface ContextLayer {
  type: "pinned" | "semantic" | "graph" | "history";
  items: ContextItem[];
}

export interface ContextItem {
  id: string;
  type: string;
  title: string;
  summary?: string;
  relation?: string;
}

export interface AssembledContext {
  layers: ContextLayer[];
  totalItems: number;
  projectSummary?: string;
}

export async function assembleContext(params: {
  organizationId: string;
  projectId: string;
  conversationId?: string;
  query: string;
}): Promise<AssembledContext> {
  const { organizationId, projectId, conversationId, query } = params;

  const [project, queryEmbedding] = await Promise.all([
    prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { name: true, description: true },
    }),
    embed(query),
  ]);

  const [semanticResults, historyLayer] = await Promise.all([
    semanticSearch({ organizationId, projectId, queryEmbedding, topK: 6 }),
    conversationId
      ? getHistoryLayer(conversationId)
      : Promise.resolve({ type: "history" as const, items: [] }),
  ]);

  const semanticLayer: ContextLayer = {
    type: "semantic",
    items: semanticResults.map((r) => ({
      id: r.entityId ?? r.id,
      type: r.entityType ?? "memory",
      title: r.content.split("\n")[0].slice(0, 80),
      summary: r.content.slice(0, 200),
    })),
  };

  const entityIds = semanticResults
    .map((r) => r.entityId)
    .filter((id): id is string => id !== null);

  const edges = await getGraphNeighbors({ organizationId, entityIds });

  const graphLayer: ContextLayer = {
    type: "graph",
    items: edges.map((e) => ({
      id: e.toId,
      type: "edge",
      title: `${e.relation}: ${e.fromId} → ${e.toId}`,
      relation: e.relation,
    })),
  };

  // Pinned memories (high importance)
  const pinnedMemories = await prisma.aIMemory.findMany({
    where: { organizationId, projectId, importance: { gte: 0.8 } },
    take: 5,
    orderBy: { importance: "desc" },
  });

  const pinnedLayer: ContextLayer = {
    type: "pinned",
    items: pinnedMemories.map((m: { id: string; entityId: string | null; entityType: string | null; type: string; content: string }) => ({
      id: m.entityId ?? m.id,
      type: m.entityType ?? m.type,
      title: m.content.split("\n")[0].slice(0, 80),
      summary: m.content.slice(0, 200),
    })),
  };

  const layers = [pinnedLayer, semanticLayer, graphLayer, historyLayer];
  const totalItems = layers.reduce((sum, l) => sum + l.items.length, 0);

  return {
    layers,
    totalItems,
    projectSummary: project
      ? `${project.name}${project.description ? `: ${project.description}` : ""}`
      : undefined,
  };
}

async function getHistoryLayer(conversationId: string): Promise<ContextLayer> {
  const messages = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, role: true, content: true },
  });

  return {
    type: "history",
    items: messages.reverse().map((m: { id: string; role: string; content: string }) => ({
      id: m.id,
      type: "message",
      title: `${m.role}: ${m.content.slice(0, 80)}${m.content.length > 80 ? "…" : ""}`,
    })),
  };
}

export function formatContextForPrompt(ctx: AssembledContext): string {
  const parts: string[] = [];

  if (ctx.projectSummary) {
    parts.push(`Project: ${ctx.projectSummary}`);
  }

  const pinned = ctx.layers.find((l) => l.type === "pinned");
  if (pinned && pinned.items.length > 0) {
    parts.push("\n## Pinned context");
    for (const item of pinned.items) {
      parts.push(`- [${item.type}] ${item.title}`);
    }
  }

  const semantic = ctx.layers.find((l) => l.type === "semantic");
  if (semantic && semantic.items.length > 0) {
    parts.push("\n## Relevant items");
    for (const item of semantic.items) {
      parts.push(`- [${item.type}] ${item.summary ?? item.title}`);
    }
  }

  const history = ctx.layers.find((l) => l.type === "history");
  if (history && history.items.length > 0) {
    parts.push("\n## Recent conversation");
    for (const item of history.items) {
      parts.push(`- ${item.title}`);
    }
  }

  return parts.join("\n");
}

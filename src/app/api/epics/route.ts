import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { EpicStatus } from "@prisma/client";

const createSchema = z.object({
  projectId: z.string().min(1),
  featureId: z.string().min(1).optional(),
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  status: z.nativeEnum(EpicStatus).optional().default("BACKLOG"),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const featureId = searchParams.get("featureId");
  if (!projectId && !featureId)
    return Errors.badRequest("projectId or featureId is required");

  const epics = await prisma.epic.findMany({
    where: {
      project: { organizationId: auth.organizationId },
      ...(projectId ? { projectId } : {}),
      ...(featureId ? { featureId } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      feature: { select: { id: true, title: true } },
      _count: { select: { userStories: true } },
    },
  });

  return ok(epics);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { projectId, featureId, ...rest } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!project) return Errors.notFound("Project");

  // If a featureId is provided, verify it belongs to the same project
  if (featureId) {
    const feature = await prisma.feature.findFirst({
      where: { id: featureId, projectId },
      select: { id: true },
    });
    if (!feature) return Errors.notFound("Feature");
  }

  const epic = await prisma.epic.create({
    data: {
      projectId,
      featureId,
      title: rest.title,
      description: rest.description,
      status: rest.status,
      tags: rest.tags ?? [],
    },
    include: {
      feature: { select: { id: true, title: true } },
      _count: { select: { userStories: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId,
      userId: auth.user.id,
      action: "CREATE",
      entityType: "epic",
      entityId: epic.id,
      diff: { after: { title: epic.title, featureId } },
    },
  });

  // Knowledge edge: feature contains epic
  if (featureId) {
    await prisma.knowledgeEdge.create({
      data: {
        organizationId: auth.organizationId,
        projectId,
        relation: "contains",
        fromType: "feature",
        fromId: featureId,
        toType: "epic",
        toId: epic.id,
        source: "system",
      },
    });
  }

  // TODO(Sprint 3): fire-and-forget embedding job for AI memory

  return ok(epic, 201);
}

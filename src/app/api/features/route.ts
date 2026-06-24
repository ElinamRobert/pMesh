import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { FeatureStatus, FeaturePriority, FeatureSource } from "@prisma/client";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  priority: z.nativeEnum(FeaturePriority).optional().default("MEDIUM"),
  source: z.nativeEnum(FeatureSource).optional().default("INTERNAL"),
  businessValue: z.number().int().min(0).max(100).optional(),
  effort: z.number().int().min(0).max(100).optional(),
  requestedBy: z.string().max(160).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return Errors.badRequest("projectId is required");

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");

  const features = await prisma.feature.findMany({
    where: {
      projectId,
      project: { organizationId: auth.organizationId },
      ...(status ? { status: status as FeatureStatus } : {}),
      ...(priority ? { priority: priority as FeaturePriority } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { epics: true } } },
  });

  return ok(features);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { projectId, ...rest } = parsed.data;

  // Ensure the project belongs to this org
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!project) return Errors.notFound("Project");

  const feature = await prisma.feature.create({
    data: {
      projectId,
      title: rest.title,
      description: rest.description,
      priority: rest.priority,
      source: rest.source,
      businessValue: rest.businessValue,
      effort: rest.effort,
      requestedBy: rest.requestedBy,
      requestedAt: rest.requestedBy ? new Date() : undefined,
      tags: rest.tags ?? [],
    },
    include: { _count: { select: { epics: true } } },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId,
      userId: auth.user.id,
      action: "CREATE",
      entityType: "feature",
      entityId: feature.id,
      diff: { after: { title: feature.title, priority: feature.priority } },
    },
  });

  // TODO(Sprint 3): fire-and-forget embedding job for AI memory

  return ok(feature, 201);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { FeatureStatus, FeaturePriority, FeatureSource } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.nativeEnum(FeatureStatus).optional(),
  priority: z.nativeEnum(FeaturePriority).optional(),
  source: z.nativeEnum(FeatureSource).optional(),
  businessValue: z.number().int().min(0).max(100).nullable().optional(),
  effort: z.number().int().min(0).max(100).nullable().optional(),
  requestedBy: z.string().max(160).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

async function loadFeature(id: string, organizationId: string) {
  return prisma.feature.findFirst({
    where: { id, project: { organizationId } },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const feature = await prisma.feature.findFirst({
    where: { id, project: { organizationId: auth.organizationId } },
    include: {
      epics: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { userStories: true } } },
      },
    },
  });

  if (!feature) return Errors.notFound("Feature");
  return ok(feature);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const existing = await loadFeature(id, auth.organizationId);
  if (!existing) return Errors.notFound("Feature");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const data = parsed.data;
  const statusChanged =
    data.status !== undefined && data.status !== existing.status;

  const updated = await prisma.feature.update({
    where: { id },
    data: {
      ...data,
      requestedAt:
        data.requestedBy && !existing.requestedBy ? new Date() : undefined,
    },
    include: { _count: { select: { epics: true } } },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.projectId,
      userId: auth.user.id,
      action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
      entityType: "feature",
      entityId: id,
      diff: statusChanged
        ? { before: { status: existing.status }, after: { status: updated.status } }
        : { before: existing.title, after: updated.title },
    },
  });

  // TODO(Sprint 3): on APPROVED/REJECTED/DEFERRED write AI memory + knowledge edge

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const existing = await loadFeature(id, auth.organizationId);
  if (!existing) return Errors.notFound("Feature");

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.projectId,
      userId: auth.user.id,
      action: "DELETE",
      entityType: "feature",
      entityId: id,
      diff: { before: { title: existing.title, status: existing.status } },
    },
  });

  await prisma.feature.delete({ where: { id } });

  return ok({ id });
}

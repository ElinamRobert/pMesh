import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { EpicStatus } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.nativeEnum(EpicStatus).optional(),
  featureId: z.string().nullable().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

async function loadEpic(id: string, organizationId: string) {
  return prisma.epic.findFirst({
    where: { id, project: { organizationId } },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const epic = await prisma.epic.findFirst({
    where: { id, project: { organizationId: auth.organizationId } },
    include: {
      feature: { select: { id: true, title: true } },
      userStories: {
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: { acceptanceCriteria: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!epic) return Errors.notFound("Epic");
  return ok(epic);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const existing = await loadEpic(id, auth.organizationId);
  if (!existing) return Errors.notFound("Epic");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { startDate, endDate, ...rest } = parsed.data;
  const statusChanged =
    rest.status !== undefined && rest.status !== existing.status;

  const updated = await prisma.epic.update({
    where: { id },
    data: {
      ...rest,
      startDate:
        startDate === null ? null : startDate ? new Date(startDate) : undefined,
      endDate: endDate === null ? null : endDate ? new Date(endDate) : undefined,
    },
    include: {
      feature: { select: { id: true, title: true } },
      _count: { select: { userStories: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.projectId,
      userId: auth.user.id,
      action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
      entityType: "epic",
      entityId: id,
      diff: statusChanged
        ? { before: { status: existing.status }, after: { status: updated.status } }
        : { before: existing.title, after: updated.title },
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const existing = await loadEpic(id, auth.organizationId);
  if (!existing) return Errors.notFound("Epic");

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.projectId,
      userId: auth.user.id,
      action: "DELETE",
      entityType: "epic",
      entityId: id,
      diff: { before: { title: existing.title, status: existing.status } },
    },
  });

  await prisma.epic.delete({ where: { id } });

  return ok({ id });
}

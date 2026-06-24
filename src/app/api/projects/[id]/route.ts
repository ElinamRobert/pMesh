import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { ProjectStatus, ProjectType } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  type: z.nativeEnum(ProjectType).optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: auth.organizationId },
    include: {
      _count: {
        select: { features: true, epics: true, roadmaps: true },
      },
    },
  });

  if (!project) return Errors.notFound("Project");
  return ok(project);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!project) return Errors.notFound("Project");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { startDate, targetDate, ...rest } = parsed.data;
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...rest,
      startDate:
        startDate === null ? null : startDate ? new Date(startDate) : undefined,
      targetDate:
        targetDate === null
          ? null
          : targetDate
          ? new Date(targetDate)
          : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: id,
      userId: auth.user.id,
      action: "UPDATE",
      entityType: "project",
      entityId: id,
      diff: { before: project, after: updated },
    },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: auth.organizationId },
  });
  if (!project) return Errors.notFound("Project");

  // Soft-delete via status
  const archived = await prisma.project.update({
    where: { id },
    data: { status: ProjectStatus.ARCHIVED },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: id,
      userId: auth.user.id,
      action: "STATUS_CHANGE",
      entityType: "project",
      entityId: id,
      diff: { before: { status: project.status }, after: { status: "ARCHIVED" } },
    },
  });

  return ok(archived);
}

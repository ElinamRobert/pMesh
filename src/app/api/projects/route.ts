import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { slugify } from "@/lib/utils";
import { ProjectStatus, ProjectType } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  type: z.nativeEnum(ProjectType).optional().default("WEB_APP"),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
});

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const projects = await prisma.project.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      type: true,
      startDate: true,
      targetDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { features: true, epics: true },
      },
    },
  });

  return ok(projects);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { name, description, type, startDate, targetDate } = parsed.data;

  // Ensure unique slug within org
  const baseSlug = slugify(name);
  const existing = await prisma.project.findMany({
    where: {
      organizationId: auth.organizationId,
      slug: { startsWith: baseSlug },
    },
    select: { slug: true },
  });
  const slug =
    existing.length === 0
      ? baseSlug
      : `${baseSlug}-${existing.length + 1}`;

  const project = await prisma.project.create({
    data: {
      organizationId: auth.organizationId,
      name,
      slug,
      description,
      type,
      status: ProjectStatus.DRAFT,
      startDate: startDate ? new Date(startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: project.id,
      userId: auth.user.id,
      action: "CREATE",
      entityType: "project",
      entityId: project.id,
      diff: { after: { name, type, status: ProjectStatus.DRAFT } },
    },
  });

  return ok(project, 201);
}

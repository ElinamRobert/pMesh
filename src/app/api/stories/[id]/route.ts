import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/api/auth";
import { ok, Errors } from "@/lib/api/response";
import { StoryStatus, StoryType, CriteriaType } from "@prisma/client";

const acSchema = z.object({
  description: z.string().min(1).max(1000),
  type: z.nativeEnum(CriteriaType).optional().default("FUNCTIONAL"),
  given: z.string().max(1000).optional(),
  when: z.string().max(1000).optional(),
  then: z.string().max(1000).optional(),
  isCompleted: z.boolean().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  persona: z.string().max(160).nullable().optional(),
  action: z.string().max(500).nullable().optional(),
  benefit: z.string().max(500).nullable().optional(),
  status: z.nativeEnum(StoryStatus).optional(),
  type: z.nativeEnum(StoryType).optional(),
  storyPoints: z.number().int().min(0).max(100).nullable().optional(),
  priority: z.number().int().optional(),
  sprint: z.string().max(80).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  tags: z.array(z.string()).optional(),
  // When provided, replaces the entire acceptance criteria set.
  acceptanceCriteria: z.array(acSchema).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

async function loadStory(id: string, organizationId: string) {
  return prisma.userStory.findFirst({
    where: { id, epic: { project: { organizationId } } },
    include: { epic: { select: { projectId: true } } },
  });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const story = await prisma.userStory.findFirst({
    where: { id, epic: { project: { organizationId: auth.organizationId } } },
    include: { acceptanceCriteria: { orderBy: { sortOrder: "asc" } } },
  });

  if (!story) return Errors.notFound("Story");
  return ok(story);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { id } = await params;
  const existing = await loadStory(id, auth.organizationId);
  if (!existing) return Errors.notFound("Story");

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { acceptanceCriteria, ...rest } = parsed.data;
  const statusChanged =
    rest.status !== undefined && rest.status !== existing.status;

  const updated = await prisma.$transaction(async (tx) => {
    if (acceptanceCriteria !== undefined) {
      // Replace the full set of acceptance criteria.
      await tx.acceptanceCriteria.deleteMany({ where: { userStoryId: id } });
      await tx.acceptanceCriteria.createMany({
        data: acceptanceCriteria.map((ac, i) => ({
          userStoryId: id,
          description: ac.description,
          type: ac.type,
          given: ac.given,
          when: ac.when,
          then: ac.then,
          isCompleted: ac.isCompleted ?? false,
          sortOrder: i,
        })),
      });
    }

    return tx.userStory.update({
      where: { id },
      data: rest,
      include: { acceptanceCriteria: { orderBy: { sortOrder: "asc" } } },
    });
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.epic.projectId,
      userId: auth.user.id,
      action: statusChanged ? "STATUS_CHANGE" : "UPDATE",
      entityType: "story",
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
  const existing = await loadStory(id, auth.organizationId);
  if (!existing) return Errors.notFound("Story");

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: existing.epic.projectId,
      userId: auth.user.id,
      action: "DELETE",
      entityType: "story",
      entityId: id,
      diff: { before: { title: existing.title } },
    },
  });

  await prisma.userStory.delete({ where: { id } });

  return ok({ id });
}

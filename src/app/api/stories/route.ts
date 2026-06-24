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
});

const createSchema = z.object({
  epicId: z.string().min(1),
  title: z.string().min(1).max(200),
  persona: z.string().max(160).optional(),
  action: z.string().max(500).optional(),
  benefit: z.string().max(500).optional(),
  status: z.nativeEnum(StoryStatus).optional().default("DRAFT"),
  type: z.nativeEnum(StoryType).optional().default("USER_STORY"),
  storyPoints: z.number().int().min(0).max(100).optional(),
  priority: z.number().int().optional().default(0),
  sprint: z.string().max(80).optional(),
  notes: z.string().max(4000).optional(),
  tags: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(acSchema).optional().default([]),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { searchParams } = new URL(req.url);
  const epicId = searchParams.get("epicId");
  if (!epicId) return Errors.badRequest("epicId is required");

  const stories = await prisma.userStory.findMany({
    where: {
      epicId,
      epic: { project: { organizationId: auth.organizationId } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    include: { acceptanceCriteria: { orderBy: { sortOrder: "asc" } } },
  });

  return ok(stories);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { epicId, acceptanceCriteria, ...rest } = parsed.data;

  const epic = await prisma.epic.findFirst({
    where: { id: epicId, project: { organizationId: auth.organizationId } },
    select: { id: true, projectId: true },
  });
  if (!epic) return Errors.notFound("Epic");

  const story = await prisma.userStory.create({
    data: {
      epicId,
      title: rest.title,
      persona: rest.persona,
      action: rest.action,
      benefit: rest.benefit,
      status: rest.status,
      type: rest.type,
      storyPoints: rest.storyPoints,
      priority: rest.priority,
      sprint: rest.sprint,
      notes: rest.notes,
      tags: rest.tags ?? [],
      acceptanceCriteria: {
        create: acceptanceCriteria.map((ac, i) => ({
          description: ac.description,
          type: ac.type,
          given: ac.given,
          when: ac.when,
          then: ac.then,
          sortOrder: i,
        })),
      },
    },
    include: { acceptanceCriteria: { orderBy: { sortOrder: "asc" } } },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: auth.organizationId,
      projectId: epic.projectId,
      userId: auth.user.id,
      action: "CREATE",
      entityType: "story",
      entityId: story.id,
      diff: { after: { title: story.title } },
    },
  });

  // TODO(Sprint 3): fire-and-forget embedding job for AI memory

  return ok(story, 201);
}

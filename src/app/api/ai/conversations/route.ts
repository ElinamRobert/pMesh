import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { ok, Errors } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const conversations = await prisma.aIConversation.findMany({
    where: {
      userId: auth.user.id,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      totalTokens: true,
      isSummarized: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return ok(conversations);
}

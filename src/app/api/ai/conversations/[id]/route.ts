import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { ok, Errors } from "@/lib/api/response";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();
  const { id } = await params;

  const conversation = await prisma.aIConversation.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return Errors.notFound("Conversation");
  return ok(conversation);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();
  const { id } = await params;

  const conversation = await prisma.aIConversation.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!conversation) return Errors.notFound("Conversation");

  await prisma.aIConversation.delete({ where: { id } });
  return ok({ deleted: true });
}

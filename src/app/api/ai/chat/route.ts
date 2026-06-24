import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/response";
import { assembleContext, formatContextForPrompt } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts/system";
import { streamChat, complete } from "@/lib/ai/llm";
import { AI_PROVIDER, LLM_MODEL } from "@/lib/ai/config";

const ChatSchema = z.object({
  message: z.string().min(1).max(8000),
  projectId: z.string().cuid(),
  conversationId: z.string().cuid().optional(),
});

const SUMMARIZE_THRESHOLD = 8000;

export async function POST(req: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return Errors.unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Errors.badRequest("Invalid JSON");
  }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success)
    return Errors.badRequest(parsed.error.issues[0]?.message ?? "Invalid input");

  const { message, projectId, conversationId: existingConversationId } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return Errors.notFound("Project");

  let conversation = existingConversationId
    ? await prisma.aIConversation.findFirst({
        where: { id: existingConversationId, userId: auth.user.id },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 20 },
        },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.aIConversation.create({
      data: {
        userId: auth.user.id,
        projectId,
        title: message.slice(0, 80),
      },
      include: { messages: true },
    });
  }

  await prisma.aIMessage.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const ctx = await assembleContext({
    organizationId: auth.organizationId,
    projectId,
    conversationId: conversation.id,
    query: message,
  });
  const systemPrompt = buildSystemPrompt(formatContextForPrompt(ctx));

  const priorMessages = (conversation.messages ?? []).map(
    (m: { role: string; content: string }) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    })
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      send({ type: "conversation_id", conversationId: conversation!.id });
      send({ type: "provider", provider: AI_PROVIDER, model: LLM_MODEL });

      let fullContent = "";

      await streamChat({
        system: systemPrompt,
        messages: [...priorMessages, { role: "user", content: message }],
        callbacks: {
          onDelta(text) {
            fullContent += text;
            send({ type: "delta", text });
          },
          async onDone() {
            const assistantMsg = await prisma.aIMessage.create({
              data: {
                conversationId: conversation!.id,
                role: "assistant",
                content: fullContent,
                model: LLM_MODEL,
              },
            });

            const newTokens = Math.ceil(
              (message.length + fullContent.length) / 4
            );
            const updated = await prisma.aIConversation.update({
              where: { id: conversation!.id },
              data: { totalTokens: { increment: newTokens }, updatedAt: new Date() },
            });

            send({
              type: "done",
              messageId: assistantMsg.id,
              conversationId: conversation!.id,
            });

            if (
              !updated.isSummarized &&
              updated.totalTokens > SUMMARIZE_THRESHOLD
            ) {
              summarizeConversation(conversation!.id).catch(() => {});
            }

            controller.close();
          },
          onError(err) {
            send({ type: "error", message: err.message });
            controller.close();
          },
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function summarizeConversation(conversationId: string): Promise<void> {
  const messages = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  const transcript = messages
    .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const summary = await complete({
    system: "You are a concise summarizer.",
    prompt: `Summarize this product management conversation in 3-5 bullet points, focusing on decisions made, features discussed, and open questions:\n\n${transcript}`,
  });

  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { isSummarized: true, contextSnapshot: { summary } },
  });
}

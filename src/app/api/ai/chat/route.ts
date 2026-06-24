import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAuthContext } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/response";
import { assembleContext, formatContextForPrompt } from "@/lib/ai/context";
import { buildSystemPrompt } from "@/lib/ai/prompts/system";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  // Verify project access
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: auth.organizationId },
  });
  if (!project) return Errors.notFound("Project");

  // Get or create conversation
  let conversation = existingConversationId
    ? await prisma.aIConversation.findFirst({
        where: { id: existingConversationId, userId: auth.user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20,
          },
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

  // Save user message
  await prisma.aIMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
  });

  // Assemble context
  const ctx = await assembleContext({
    organizationId: auth.organizationId,
    projectId,
    conversationId: conversation.id,
    query: message,
  });
  const contextText = formatContextForPrompt(ctx);
  const systemPrompt = buildSystemPrompt(contextText);

  // Build message history for Claude
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
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      send({ type: "conversation_id", conversationId: conversation!.id });

      let fullContent = "";

      try {
        const stream = anthropic.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            ...priorMessages,
            { role: "user", content: message },
          ],
        });

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            fullContent += chunk.delta.text;
            send({ type: "delta", text: chunk.delta.text });
          }
        }

        // Persist assistant message
        const assistantMsg = await prisma.aIMessage.create({
          data: {
            conversationId: conversation!.id,
            role: "assistant",
            content: fullContent,
          },
        });

        // Update conversation token count estimate
        const newTokens = Math.ceil((message.length + fullContent.length) / 4);
        const updatedConversation = await prisma.aIConversation.update({
          where: { id: conversation!.id },
          data: {
            totalTokens: { increment: newTokens },
            updatedAt: new Date(),
          },
        });

        send({
          type: "done",
          messageId: assistantMsg.id,
          conversationId: conversation!.id,
        });

        // Fire-and-forget summarization if threshold crossed
        if (
          !updatedConversation.isSummarized &&
          updatedConversation.totalTokens > SUMMARIZE_THRESHOLD
        ) {
          summarizeConversation(conversation!.id).catch(() => {});
        }
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "AI error",
        });
      } finally {
        controller.close();
      }
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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Summarize this product management conversation in 3-5 bullet points, focusing on decisions made, features discussed, and open questions:\n\n${transcript}`,
      },
    ],
  });

  const summary =
    response.content[0].type === "text" ? response.content[0].text : "";

  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: {
      isSummarized: true,
      contextSnapshot: { summary },
    },
  });
}

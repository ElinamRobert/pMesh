import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { AI_PROVIDER, LLM_MODEL, OLLAMA_BASE_URL } from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * Stream a chat completion from the configured provider.
 * Calls onDelta for each text chunk, onDone when finished, onError on failure.
 */
export async function streamChat(params: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  callbacks: StreamCallbacks;
}): Promise<void> {
  const { system, messages, maxTokens = 2048, callbacks } = params;

  switch (AI_PROVIDER) {
    case "anthropic":
      return streamAnthropic({ system, messages, maxTokens, callbacks });
    case "groq":
      return streamOpenAICompat({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY ?? "",
        system,
        messages,
        maxTokens,
        callbacks,
      });
    case "ollama":
      return streamOpenAICompat({
        baseURL: `${OLLAMA_BASE_URL}/v1`,
        apiKey: "ollama", // Ollama ignores the key
        system,
        messages,
        maxTokens,
        callbacks,
      });
    case "openai":
      return streamOpenAICompat({
        baseURL: "https://api.openai.com/v1",
        apiKey: process.env.OPENAI_API_KEY ?? "",
        system,
        messages,
        maxTokens,
        callbacks,
      });
    default:
      throw new Error(`Unknown AI provider: ${AI_PROVIDER}`);
  }
}

async function streamAnthropic(params: {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  callbacks: StreamCallbacks;
}): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const anthropic = new Anthropic({ apiKey });

  try {
    const stream = anthropic.messages.stream({
      model: LLM_MODEL,
      max_tokens: params.maxTokens,
      system: params.system,
      messages: params.messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        params.callbacks.onDelta(chunk.delta.text);
      }
    }

    params.callbacks.onDone();
  } catch (err) {
    params.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function streamOpenAICompat(params: {
  baseURL: string;
  apiKey: string;
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  callbacks: StreamCallbacks;
}): Promise<void> {
  if (!params.apiKey && AI_PROVIDER !== "ollama") {
    throw new Error(`API key not set for provider: ${AI_PROVIDER}`);
  }

  const client = new OpenAI({
    apiKey: params.apiKey || "none",
    baseURL: params.baseURL,
  });

  try {
    const stream = await client.chat.completions.create({
      model: LLM_MODEL,
      max_tokens: params.maxTokens,
      stream: true,
      messages: [
        { role: "system", content: params.system },
        ...params.messages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) params.callbacks.onDelta(text);
    }

    params.callbacks.onDone();
  } catch (err) {
    params.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Non-streaming completion — used for background tasks like summarisation.
 */
export async function complete(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { system, prompt, maxTokens = 512 } = params;

  switch (AI_PROVIDER) {
    case "anthropic": {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      });
      const res = await anthropic.messages.create({
        model: LLM_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      return res.content[0]?.type === "text" ? res.content[0].text : "";
    }

    case "groq":
    case "ollama":
    case "openai": {
      const baseURL =
        AI_PROVIDER === "groq"
          ? "https://api.groq.com/openai/v1"
          : AI_PROVIDER === "ollama"
          ? `${OLLAMA_BASE_URL}/v1`
          : "https://api.openai.com/v1";
      const apiKey =
        AI_PROVIDER === "groq"
          ? (process.env.GROQ_API_KEY ?? "")
          : AI_PROVIDER === "ollama"
          ? "ollama"
          : (process.env.OPENAI_API_KEY ?? "");

      const client = new OpenAI({ apiKey: apiKey || "none", baseURL });
      const res = await client.chat.completions.create({
        model: LLM_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    }

    default:
      throw new Error(`Unknown AI provider: ${AI_PROVIDER}`);
  }
}

export type LLMProvider = "anthropic" | "groq" | "ollama" | "openai";
export type EmbedProvider = "voyage" | "ollama" | "openai";

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-opus-4-8",
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.2",
  openai: "gpt-4o-mini",
};

const DEFAULT_EMBED_MODELS: Record<EmbedProvider, string> = {
  voyage: "voyage-3",
  ollama: "nomic-embed-text",
  openai: "text-embedding-3-small",
};

export const AI_PROVIDER = (process.env.AI_PROVIDER ?? "anthropic") as LLMProvider;
export const LLM_MODEL = process.env.LLM_MODEL ?? DEFAULT_MODELS[AI_PROVIDER];
export const EMBED_PROVIDER = (process.env.EMBED_PROVIDER ?? "voyage") as EmbedProvider;
export const EMBED_MODEL = process.env.EMBED_MODEL ?? DEFAULT_EMBED_MODELS[EMBED_PROVIDER];
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

/** Embedding dimensions per model (for pgvector column size awareness) */
export const EMBED_DIMS: Record<string, number> = {
  "voyage-3": 1024,
  "nomic-embed-text": 768,
  "text-embedding-3-small": 1536,
};

import { EMBED_PROVIDER, EMBED_MODEL, OLLAMA_BASE_URL } from "./config";

export async function embed(text: string): Promise<number[]> {
  switch (EMBED_PROVIDER) {
    case "voyage":
      return embedVoyage(text);
    case "ollama":
      return embedOllama(text);
    case "openai":
      return embedOpenAI(text);
    default:
      throw new Error(`Unknown embed provider: ${EMBED_PROVIDER}`);
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return Promise.all(texts.map((t) => embed(t)));
}

async function embedVoyage(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });

  if (!res.ok) throw new Error(`Voyage embed failed: ${res.status}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

async function embedOllama(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`);
  const json = await res.json();
  return json.embedding as number[];
}

async function embedOpenAI(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });

  if (!res.ok) throw new Error(`OpenAI embed failed: ${res.status}`);
  const json = await res.json();
  return json.data[0].embedding as number[];
}

export function buildNodeText(
  type: "feature" | "epic" | "story",
  data: {
    title: string;
    description?: string | null;
    persona?: string | null;
    action?: string | null;
    benefit?: string | null;
  }
): string {
  const parts: string[] = [`[${type.toUpperCase()}] ${data.title}`];
  if (data.description) parts.push(data.description);
  if (data.persona && data.action && data.benefit) {
    parts.push(
      `As a ${data.persona}, I want ${data.action} so that ${data.benefit}.`
    );
  }
  return parts.join("\n");
}

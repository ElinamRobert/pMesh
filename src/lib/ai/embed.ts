export const EMBEDDING_DIMS = 1024;

/**
 * Generates a text embedding via Voyage AI.
 * Requires VOYAGE_API_KEY env var (or falls back to ANTHROPIC_API_KEY for Anthropic-hosted Voyage).
 */
export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No embedding API key configured");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embed failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("No embedding API key configured");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "voyage-3",
      input: texts,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embed batch failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return json.data.map((d: { embedding: number[] }) => d.embedding);
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

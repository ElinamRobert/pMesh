import { NextResponse } from "next/server";
import { AI_PROVIDER, LLM_MODEL, EMBED_PROVIDER, EMBED_MODEL } from "@/lib/ai/config";

export async function GET() {
  return NextResponse.json({
    llm: { provider: AI_PROVIDER, model: LLM_MODEL },
    embeddings: { provider: EMBED_PROVIDER, model: EMBED_MODEL },
  });
}

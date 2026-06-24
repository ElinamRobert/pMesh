import type { Metadata } from "next";

export const metadata: Metadata = { title: "Features" };

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function FeaturesPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Features</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sprint 2 — AI feature generation, kanban board, and priority management
        coming next.
      </p>
      <p className="mt-1 text-xs text-muted-foreground font-mono">
        projectId: {projectId}
      </p>
    </div>
  );
}

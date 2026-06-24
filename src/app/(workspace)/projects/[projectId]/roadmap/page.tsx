import type { Metadata } from "next";

export const metadata: Metadata = { title: "Roadmap" };

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function RoadmapPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sprint 3 — AI-powered swimlane roadmap with scheduling coming next.
      </p>
      <p className="mt-1 text-xs text-muted-foreground font-mono">
        projectId: {projectId}
      </p>
    </div>
  );
}

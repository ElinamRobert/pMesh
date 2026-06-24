import type { Metadata } from "next";

export const metadata: Metadata = { title: "Epics" };

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function EpicsPage({ params }: Props) {
  const { projectId } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Epics</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sprint 2 — AI epic decomposition from features coming next.
      </p>
      <p className="mt-1 text-xs text-muted-foreground font-mono">
        projectId: {projectId}
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { EpicDetailClient } from "@/components/epics/epic-detail-client";

export const metadata: Metadata = { title: "Epic" };

interface Props {
  params: Promise<{ projectId: string; epicId: string }>;
}

export default async function EpicDetailPage({ params }: Props) {
  const { projectId, epicId } = await params;
  return <EpicDetailClient projectId={projectId} epicId={epicId} />;
}

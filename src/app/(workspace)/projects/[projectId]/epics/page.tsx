import type { Metadata } from "next";
import { EpicsClient } from "@/components/epics/epics-client";

export const metadata: Metadata = { title: "Epics" };

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function EpicsPage({ params }: Props) {
  const { projectId } = await params;
  return <EpicsClient projectId={projectId} />;
}

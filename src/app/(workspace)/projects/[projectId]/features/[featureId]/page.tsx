import type { Metadata } from "next";
import { FeatureDetailClient } from "@/components/features/feature-detail-client";

export const metadata: Metadata = { title: "Feature" };

interface Props {
  params: Promise<{ projectId: string; featureId: string }>;
}

export default async function FeatureDetailPage({ params }: Props) {
  const { projectId, featureId } = await params;
  return <FeatureDetailClient projectId={projectId} featureId={featureId} />;
}

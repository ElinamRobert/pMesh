import type { Metadata } from "next";
import { FeaturesClient } from "@/components/features/features-client";

export const metadata: Metadata = { title: "Features" };

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function FeaturesPage({ params }: Props) {
  const { projectId } = await params;
  return <FeaturesClient projectId={projectId} />;
}

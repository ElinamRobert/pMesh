"use client";

import { useEffect } from "react";
import { use } from "react";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { useProject } from "@/hooks/use-projects";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project } = useProject(projectId);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  useEffect(() => {
    if (project) {
      setActiveProject(project.id, project.name);
    }
  }, [project, setActiveProject]);

  return <>{children}</>;
}

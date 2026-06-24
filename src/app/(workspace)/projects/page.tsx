import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, FolderKanban, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projects" };

const statusVariant: Record<string, "success" | "warning" | "secondary" | "outline"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ON_HOLD: "secondary",
  COMPLETED: "outline",
  ARCHIVED: "outline",
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              projects: {
                where: { status: { not: "ARCHIVED" } },
                orderBy: { updatedAt: "desc" },
                include: {
                  _count: { select: { features: true, epics: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const organization = user?.memberships[0]?.organization;
  const projects = organization?.projects ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {projects.length} active project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
          <Brain className="mb-4 h-10 w-10 text-muted-foreground/50" />
          <p className="text-base font-medium">No projects yet</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Create your first project and let ProductPilot AI become your
            intelligent second brain.
          </p>
          <Button asChild className="mt-6">
            <Link href="/projects/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create first project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex flex-col gap-4 rounded-lg border border-border bg-card p-5 transition-all hover:border-ring hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent">
                  <FolderKanban className="h-4 w-4 text-accent-foreground" />
                </div>
                <Badge variant={statusVariant[project.status] ?? "outline"}>
                  {project.status.toLowerCase().replace("_", " ")}
                </Badge>
              </div>

              <div className="flex-1">
                <h3 className="font-medium leading-snug">{project.name}</h3>
                {project.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>{project._count.features} features</span>
                  <span>{project._count.epics} epics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>{formatRelative(project.updatedAt)}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FolderKanban, Plus, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  const user = supabaseUser
    ? await prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
        include: {
          memberships: {
            include: {
              organization: {
                include: {
                  projects: {
                    orderBy: { updatedAt: "desc" },
                    take: 6,
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const organization = user?.memberships[0]?.organization;
  const projects = organization?.projects ?? [];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Good morning{user ? `, ${user.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {organization
            ? `${organization.name} workspace`
            : "No workspace yet — create your first project to get started."}
        </p>
      </div>

      {/* Recent projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Projects
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/projects/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New project
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
            <Brain className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No projects yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              Create your first project to start building your AI-powered
              product workspace.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/projects/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create project
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-ring hover:bg-accent/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      project.status === "ACTIVE"
                        ? "bg-green-500/10 text-green-500"
                        : project.status === "DRAFT"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.status.toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium leading-snug">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(project.updatedAt)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

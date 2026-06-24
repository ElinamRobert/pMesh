import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatDate, formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Layers3,
  MapIcon,
  Brain,
  Calendar,
  Clock,
  Settings,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  return { title: project?.name ?? "Project" };
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.userId ?? null;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organization: {
        members: { some: { userId: userId ?? "" } },
      },
    },
    include: {
      _count: {
        select: {
          features: true,
          epics: true,
          roadmaps: true,
        },
      },
      features: {
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!project) notFound();

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-500",
    DRAFT: "bg-yellow-500/10 text-yellow-500",
    ON_HOLD: "bg-orange-500/10 text-orange-500",
    COMPLETED: "bg-blue-500/10 text-blue-500",
    ARCHIVED: "bg-muted text-muted-foreground",
  };

  const priorityColor: Record<string, string> = {
    CRITICAL: "text-red-500",
    HIGH: "text-orange-500",
    MEDIUM: "text-yellow-500",
    LOW: "text-muted-foreground",
    ICEBOX: "text-muted-foreground/50",
  };

  const quickLinks = [
    {
      href: `/projects/${projectId}/features`,
      icon: Sparkles,
      label: "Features",
      count: project._count.features,
      description: "Product capabilities and requests",
    },
    {
      href: `/projects/${projectId}/epics`,
      icon: Layers3,
      label: "Epics",
      count: project._count.epics,
      description: "Grouped chunks of work",
    },
    {
      href: `/projects/${projectId}/roadmap`,
      icon: MapIcon,
      label: "Roadmap",
      count: project._count.roadmaps,
      description: "Timeline and delivery plan",
    },
    {
      href: `/projects/${projectId}/memory`,
      icon: Brain,
      label: "AI Memory",
      count: null,
      description: "Product context and decisions",
    },
  ];

  return (
    <div className="p-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColor[project.status]
              }`}
            >
              {project.status.toLowerCase().replace("_", " ")}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground max-w-xl">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {project.targetDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Target: {formatDate(project.targetDate)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Updated {formatRelative(project.updatedAt)}
            </span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Settings
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(({ href, icon: Icon, label, count, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-ring hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <Icon className="h-4 w-4" />
              </div>
              {count !== null && (
                <span className="text-lg font-semibold tabular-nums">
                  {count}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 self-end" />
          </Link>
        ))}
      </div>

      {/* Recent features */}
      {project.features.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Recent features
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/projects/${projectId}/features`}>
                View all
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border border-border divide-y divide-border">
            {project.features.map((feature) => (
              <Link
                key={feature.id}
                href={`/projects/${projectId}/features/${feature.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-xs font-medium ${
                      priorityColor[feature.priority]
                    }`}
                  >
                    {feature.priority.charAt(0)}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {feature.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground capitalize">
                    {feature.status.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(feature.updatedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

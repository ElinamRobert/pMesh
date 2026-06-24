"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Layers } from "lucide-react";
import { useFeature } from "@/hooks/use-features";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EpicFormDialog } from "@/components/epics/epic-form-dialog";
import {
  FEATURE_STATUS,
  FEATURE_PRIORITY,
  FEATURE_SOURCE_LABEL,
  EPIC_STATUS,
} from "@/lib/domain-meta";

interface Props {
  projectId: string;
  featureId: string;
}

export function FeatureDetailClient({ projectId, featureId }: Props) {
  const { data: feature, isLoading } = useFeature(featureId);
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading feature…</div>
    );
  }

  if (!feature) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Feature not found.</p>
        <Link
          href={`/projects/${projectId}/features`}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          ← Back to features
        </Link>
      </div>
    );
  }

  const status = FEATURE_STATUS[feature.status];
  const priority = FEATURE_PRIORITY[feature.priority];

  return (
    <div className="p-8">
      <Link
        href={`/projects/${projectId}/features`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Features
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {feature.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={status?.variant ?? "secondary"}>
              {status?.label ?? feature.status}
            </Badge>
            <Badge variant={priority?.variant ?? "outline"}>
              {priority?.label ?? feature.priority} priority
            </Badge>
            <span className="text-xs text-muted-foreground">
              {FEATURE_SOURCE_LABEL[feature.source] ?? feature.source}
            </span>
            {feature.businessValue != null && (
              <span className="text-xs text-muted-foreground">
                · Value {feature.businessValue}/100
              </span>
            )}
            {feature.requestedBy && (
              <span className="text-xs text-muted-foreground">
                · Requested by {feature.requestedBy}
              </span>
            )}
          </div>
        </div>
      </div>

      {feature.description && (
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          {feature.description}
        </p>
      )}

      {/* Epics */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <Layers className="h-5 w-5 text-muted-foreground" /> Epics
        </h2>
        <Button size="sm" onClick={() => setEpicDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New epic
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {feature.epics.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No epics yet. Break this feature into deliverable chunks.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setEpicDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add an epic
              </Button>
            </CardContent>
          </Card>
        )}

        {feature.epics.map((epic) => {
          const es = EPIC_STATUS[epic.status];
          return (
            <Link
              key={epic.id}
              href={`/projects/${projectId}/epics/${epic.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{epic.title}</p>
                    {epic.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {epic.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {epic._count.userStories} stories
                    </span>
                    <Badge variant={es?.variant ?? "secondary"}>
                      {es?.label ?? epic.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <EpicFormDialog
        projectId={projectId}
        featureId={featureId}
        open={epicDialogOpen}
        onOpenChange={setEpicDialogOpen}
      />
    </div>
  );
}

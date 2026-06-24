"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";
import { useEpic } from "@/hooks/use-epics";
import {
  useUpdateStory,
  useDeleteStory,
  type StoryWithCriteria,
} from "@/hooks/use-stories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StoryFormDialog } from "@/components/stories/story-form-dialog";
import { EpicFormDialog } from "./epic-form-dialog";
import { EPIC_STATUS, STORY_STATUS } from "@/lib/domain-meta";

interface Props {
  projectId: string;
  epicId: string;
}

export function EpicDetailClient({ projectId, epicId }: Props) {
  const { data: epic, isLoading } = useEpic(epicId);
  const updateStory = useUpdateStory(epicId);
  const deleteStory = useDeleteStory(epicId);

  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryWithCriteria | undefined>();
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading epic…</div>;
  }

  if (!epic) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Epic not found.</p>
        <Link
          href={`/projects/${projectId}/epics`}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          ← Back to epics
        </Link>
      </div>
    );
  }

  const es = EPIC_STATUS[epic.status];
  const totalPoints = epic.userStories.reduce(
    (sum, s) => sum + (s.storyPoints ?? 0),
    0
  );

  function openCreateStory() {
    setEditingStory(undefined);
    setStoryDialogOpen(true);
  }

  function toggleCriterion(story: StoryWithCriteria, index: number) {
    const acceptanceCriteria = story.acceptanceCriteria.map((ac, i) => ({
      description: ac.description,
      type: ac.type,
      given: ac.given ?? undefined,
      when: ac.when ?? undefined,
      then: ac.then ?? undefined,
      isCompleted: i === index ? !ac.isCompleted : ac.isCompleted,
    }));
    updateStory.mutate({ id: story.id, acceptanceCriteria });
  }

  return (
    <div className="p-8">
      <Link
        href={`/projects/${projectId}/epics`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Epics
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{epic.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={es?.variant ?? "secondary"}>
              {es?.label ?? epic.status}
            </Badge>
            {epic.feature && (
              <Link
                href={`/projects/${projectId}/features/${epic.feature.id}`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {epic.feature.title}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              · {epic.userStories.length} stories · {totalPoints} pts
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEpicDialogOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit epic
        </Button>
      </div>

      {epic.description && (
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">
          {epic.description}
        </p>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <FileText className="h-5 w-5 text-muted-foreground" /> User stories
        </h2>
        <Button size="sm" onClick={openCreateStory}>
          <Plus className="mr-2 h-4 w-4" /> New story
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {epic.userStories.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No stories yet.</p>
              <Button variant="outline" className="mt-3" onClick={openCreateStory}>
                <Plus className="mr-2 h-4 w-4" /> Add a story
              </Button>
            </CardContent>
          </Card>
        )}

        {epic.userStories.map((story) => {
          const ss = STORY_STATUS[story.status];
          const narrative =
            story.persona || story.action || story.benefit
              ? `As a ${story.persona ?? "user"}, I want ${
                  story.action ?? "…"
                } so that ${story.benefit ?? "…"}.`
              : null;
          return (
            <Card key={story.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{story.title}</p>
                      {story.storyPoints != null && (
                        <Badge variant="outline">{story.storyPoints} pts</Badge>
                      )}
                    </div>
                    {narrative && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {narrative}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ss?.variant ?? "secondary"}>
                      {ss?.label ?? story.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingStory(story);
                            setStoryDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (confirm(`Delete story "${story.title}"?`))
                              deleteStory.mutate(story.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {story.acceptanceCriteria.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {story.acceptanceCriteria.map((ac, i) => (
                      <li key={ac.id} className="flex items-start gap-2 text-sm">
                        <button
                          type="button"
                          onClick={() => toggleCriterion(story, i)}
                          className="mt-0.5"
                          aria-label="Toggle criterion"
                        >
                          <Checkbox checked={ac.isCompleted} readOnly />
                        </button>
                        <span
                          className={
                            ac.isCompleted
                              ? "text-muted-foreground line-through"
                              : ""
                          }
                        >
                          {ac.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <StoryFormDialog
        epicId={epicId}
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        story={editingStory}
      />
      <EpicFormDialog
        projectId={projectId}
        open={epicDialogOpen}
        onOpenChange={setEpicDialogOpen}
        epic={epic}
      />
    </div>
  );
}

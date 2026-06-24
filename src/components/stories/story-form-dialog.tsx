"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import {
  useCreateStory,
  useUpdateStory,
  type StoryWithCriteria,
  type AcceptanceCriteriaInput,
} from "@/hooks/use-stories";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORY_STATUS_OPTIONS, STORY_TYPE_OPTIONS } from "@/lib/domain-meta";

interface Props {
  epicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story?: StoryWithCriteria;
}

export function StoryFormDialog({ epicId, open, onOpenChange, story }: Props) {
  const isEdit = !!story;
  const create = useCreateStory(epicId);
  const update = useUpdateStory(epicId);

  const [title, setTitle] = useState("");
  const [persona, setPersona] = useState("");
  const [action, setAction] = useState("");
  const [benefit, setBenefit] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [type, setType] = useState("USER_STORY");
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [criteria, setCriteria] = useState<AcceptanceCriteriaInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(story?.title ?? "");
    setPersona(story?.persona ?? "");
    setAction(story?.action ?? "");
    setBenefit(story?.benefit ?? "");
    setStatus(story?.status ?? "DRAFT");
    setType(story?.type ?? "USER_STORY");
    setStoryPoints(story?.storyPoints != null ? String(story.storyPoints) : "");
    setCriteria(
      story?.acceptanceCriteria.map((ac) => ({
        description: ac.description,
        type: ac.type,
        isCompleted: ac.isCompleted,
      })) ?? [{ description: "" }]
    );
  }, [open, story]);

  const isPending = create.isPending || update.isPending;

  function updateCriterion(i: number, description: string) {
    setCriteria((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, description } : c))
    );
  }

  function addCriterion() {
    setCriteria((prev) => [...prev, { description: "" }]);
  }

  function removeCriterion(i: number) {
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanCriteria = criteria.filter((c) => c.description.trim());
    const points = storyPoints === "" ? undefined : Number(storyPoints);

    try {
      if (isEdit) {
        await update.mutateAsync({
          id: story.id,
          title,
          persona: persona || undefined,
          action: action || undefined,
          benefit: benefit || undefined,
          status,
          type,
          storyPoints: points,
          acceptanceCriteria: cleanCriteria,
        });
      } else {
        await create.mutateAsync({
          epicId,
          title,
          persona: persona || undefined,
          action: action || undefined,
          benefit: benefit || undefined,
          status,
          type,
          storyPoints: points,
          acceptanceCriteria: cleanCriteria,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit story" : "New user story"}</DialogTitle>
          <DialogDescription>
            Use the “As a… I want… so that…” format and add acceptance criteria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="story-title">Title *</Label>
            <Input
              id="story-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the story"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="persona">As a…</Label>
              <Input
                id="persona"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="Finance Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">I want…</Label>
              <Input
                id="action"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="to export transactions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit">so that…</Label>
              <Input
                id="benefit"
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                placeholder="I can reconcile accounts"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="story-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="story-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="story-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="story-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORY_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Story points</Label>
              <Input
                id="points"
                type="number"
                min={0}
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Acceptance criteria</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addCriterion}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c.description}
                    onChange={(e) => updateCriterion(i, e.target.value)}
                    placeholder={`Criterion ${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeCriterion(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {criteria.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No criteria yet — add at least two before marking a story Ready.
                </p>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create story"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

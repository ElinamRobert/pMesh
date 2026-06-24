"use client";

import { useState, useEffect } from "react";
import { useCreateEpic, useUpdateEpic } from "@/hooks/use-epics";

interface EditableEpic {
  id: string;
  title: string;
  description: string | null;
  status: string;
}
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EPIC_STATUS_OPTIONS } from "@/lib/domain-meta";

interface Props {
  projectId: string;
  /** When set, the epic is created under this feature. */
  featureId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epic?: EditableEpic;
}

export function EpicFormDialog({
  projectId,
  featureId,
  open,
  onOpenChange,
  epic,
}: Props) {
  const isEdit = !!epic;
  const create = useCreateEpic(projectId);
  const update = useUpdateEpic();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("BACKLOG");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(epic?.title ?? "");
    setDescription(epic?.description ?? "");
    setStatus(epic?.status ?? "BACKLOG");
  }, [open, epic]);

  const isPending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({
          id: epic.id,
          title,
          description: description || null,
          status: status as never,
        });
      } else {
        await create.mutateAsync({
          projectId,
          featureId,
          title,
          description: description || undefined,
          status,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit epic" : "New epic"}</DialogTitle>
          <DialogDescription>
            An epic groups related user stories under a feature.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="epic-title">Title *</Label>
            <Input
              id="epic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. OAuth 2.0 connection flow"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="epic-description">Description</Label>
            <Textarea
              id="epic-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="epic-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="epic-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPIC_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create epic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

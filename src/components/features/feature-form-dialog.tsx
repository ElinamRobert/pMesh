"use client";

import { useState, useEffect } from "react";
import { useCreateFeature, useUpdateFeature } from "@/hooks/use-features";
import type { FeatureWithCounts } from "@/hooks/use-features";
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
import {
  FEATURE_PRIORITY_OPTIONS,
  FEATURE_SOURCE_OPTIONS,
} from "@/lib/domain-meta";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this feature instead of creating one. */
  feature?: FeatureWithCounts;
}

export function FeatureFormDialog({
  projectId,
  open,
  onOpenChange,
  feature,
}: Props) {
  const isEdit = !!feature;
  const create = useCreateFeature(projectId);
  const update = useUpdateFeature(projectId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [source, setSource] = useState("INTERNAL");
  const [businessValue, setBusinessValue] = useState(50);
  const [requestedBy, setRequestedBy] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset / hydrate the form whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(feature?.title ?? "");
    setDescription(feature?.description ?? "");
    setPriority(feature?.priority ?? "MEDIUM");
    setSource(feature?.source ?? "INTERNAL");
    setBusinessValue(feature?.businessValue ?? 50);
    setRequestedBy(feature?.requestedBy ?? "");
  }, [open, feature]);

  const isPending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({
          id: feature.id,
          title,
          description: description || null,
          priority: priority as never,
          source: source as never,
          businessValue,
          requestedBy: requestedBy || null,
        });
      } else {
        await create.mutateAsync({
          projectId,
          title,
          description: description || undefined,
          priority,
          source,
          businessValue,
          requestedBy: requestedBy || undefined,
        });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit feature" : "New feature"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this feature."
              : "Capture a feature request. You can refine priority and decompose it into epics later."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QuickBooks integration"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What problem does this solve? Who asked for it?"
              className="min-h-[90px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessValue">
                Business value:{" "}
                <span className="font-mono text-primary">{businessValue}</span>
              </Label>
              <input
                id="businessValue"
                type="range"
                min={0}
                max={100}
                step={5}
                value={businessValue}
                onChange={(e) => setBusinessValue(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedBy">Requested by</Label>
              <Input
                id="requestedBy"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
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
              {isPending
                ? "Saving…"
                : isEdit
                ? "Save changes"
                : "Create feature"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import {
  useEpics,
  useDeleteEpic,
  type EpicWithMeta,
} from "@/hooks/use-epics";
import { EPIC_STATUS } from "@/lib/domain-meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { EpicFormDialog } from "./epic-form-dialog";

export function EpicsClient({ projectId }: { projectId: string }) {
  const { data: epics, isLoading } = useEpics({ projectId });
  const del = useDeleteEpic();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EpicWithMeta | undefined>();

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Epics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deliverable chunks of work, each grouping a set of user stories.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New epic
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading epics…</p>
        )}

        {!isLoading && epics?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No epics yet.</p>
              <Button variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Create your first epic
              </Button>
            </CardContent>
          </Card>
        )}

        {epics?.map((epic) => {
          const es = EPIC_STATUS[epic.status];
          return (
            <Card key={epic.id} className="group transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between py-4">
                <Link
                  href={`/projects/${projectId}/epics/${epic.id}`}
                  className="flex-1"
                >
                  <p className="font-medium">{epic.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {epic.feature && <span>{epic.feature.title}</span>}
                    {epic.feature && <span>·</span>}
                    <span>{epic._count.userStories} stories</span>
                  </div>
                </Link>
                <div className="flex items-center gap-3">
                  <Badge variant={es?.variant ?? "secondary"}>
                    {es?.label ?? epic.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(epic);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete epic "${epic.title}"?`))
                            del.mutate(epic.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EpicFormDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        epic={editing}
      />
    </div>
  );
}

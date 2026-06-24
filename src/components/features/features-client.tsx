"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MoreHorizontal, Search, Trash2, Pencil } from "lucide-react";
import {
  useFeatures,
  useUpdateFeature,
  useDeleteFeature,
  type FeatureWithCounts,
} from "@/hooks/use-features";
import {
  FEATURE_STATUS,
  FEATURE_STATUS_OPTIONS,
  FEATURE_PRIORITY,
  FEATURE_PRIORITY_OPTIONS,
} from "@/lib/domain-meta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FeatureFormDialog } from "./feature-form-dialog";
import { formatRelative } from "@/lib/utils";

const ALL = "ALL";

export function FeaturesClient({ projectId }: { projectId: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureWithCounts | undefined>();

  const { data: features, isLoading } = useFeatures(projectId, {
    search: search || undefined,
    status: statusFilter === ALL ? undefined : statusFilter,
    priority: priorityFilter === ALL ? undefined : priorityFilter,
  });

  const update = useUpdateFeature(projectId);
  const del = useDeleteFeature(projectId);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(f: FeatureWithCounts) {
    setEditing(f);
    setDialogOpen(true);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Features</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture, prioritize, and approve features. Decompose them into epics
            and stories.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New feature
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {FEATURE_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priorities</SelectItem>
            {FEATURE_PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Feature</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Priority</th>
              <th className="px-4 py-3 text-left font-medium">Value</th>
              <th className="px-4 py-3 text-left font-medium">Epics</th>
              <th className="px-4 py-3 text-left font-medium">Updated</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Loading features…
                </td>
              </tr>
            )}

            {!isLoading && features?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No features yet.
                  </p>
                  <Button variant="outline" className="mt-3" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Create your first feature
                  </Button>
                </td>
              </tr>
            )}

            {features?.map((f) => {
              const status = FEATURE_STATUS[f.status];
              const priority = FEATURE_PRIORITY[f.priority];
              return (
                <tr key={f.id} className="group hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${projectId}/features/${f.id}`}
                      className="font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                    {f.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {f.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={status?.variant ?? "secondary"}>
                      {status?.label ?? f.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={priority?.variant ?? "outline"}>
                      {priority?.label ?? f.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.businessValue ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f._count.epics}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatRelative(f.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
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
                        <DropdownMenuItem onClick={() => openEdit(f)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Set status</DropdownMenuLabel>
                        {FEATURE_STATUS_OPTIONS.map((o) => (
                          <DropdownMenuItem
                            key={o.value}
                            disabled={f.status === o.value}
                            onClick={() =>
                              update.mutate({ id: f.id, status: o.value as never })
                            }
                          >
                            {o.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            if (
                              confirm(`Delete feature "${f.title}"? This cannot be undone.`)
                            )
                              del.mutate(f.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <FeatureFormDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        feature={editing}
      />
    </div>
  );
}

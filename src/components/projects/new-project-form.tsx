"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProject } from "@/hooks/use-projects";
import { useWorkspaceStore } from "@/stores/workspace.store";
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

const PROJECT_TYPES = [
  { value: "WEB_APP", label: "Web Application" },
  { value: "MOBILE_APP", label: "Mobile Application" },
  { value: "API", label: "API / Backend Service" },
  { value: "DATA_PLATFORM", label: "Data Platform" },
  { value: "INTERNAL_TOOL", label: "Internal Tool" },
  { value: "OTHER", label: "Other" },
] as const;

export function NewProjectForm() {
  const router = useRouter();
  const { mutateAsync: createProject, isPending } = useCreateProject();
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("WEB_APP");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      const project = await createProject({ name, description, type });
      setActiveProject(project.id, project.name);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Project name *</Label>
        <Input
          id="name"
          placeholder="e.g. Payments Platform"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What is this product? Who uses it? What value does it deliver?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[100px]"
        />
        <p className="text-xs text-muted-foreground">
          This becomes part of your AI memory — the more context you provide,
          the better the AI understands your product.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Project type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? "Creating…" : "Create project"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/projects")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

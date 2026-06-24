"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Epic, UserStory, AcceptanceCriteria } from "@prisma/client";

export type EpicWithMeta = Epic & {
  feature: { id: string; title: string } | null;
  _count: { userStories: number };
};

export type EpicWithStories = Epic & {
  feature: { id: string; title: string } | null;
  userStories: (UserStory & { acceptanceCriteria: AcceptanceCriteria[] })[];
};

async function fetchEpics(params: {
  projectId?: string;
  featureId?: string;
}): Promise<EpicWithMeta[]> {
  const qs = new URLSearchParams();
  if (params.projectId) qs.set("projectId", params.projectId);
  if (params.featureId) qs.set("featureId", params.featureId);

  const res = await fetch(`/api/epics?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch epics");
  const { data } = await res.json();
  return data;
}

async function fetchEpic(id: string): Promise<EpicWithStories> {
  const res = await fetch(`/api/epics/${id}`);
  if (!res.ok) throw new Error("Failed to fetch epic");
  const { data } = await res.json();
  return data;
}

export function useEpics(params: { projectId?: string; featureId?: string }) {
  return useQuery({
    queryKey: ["epics", params],
    queryFn: () => fetchEpics(params),
    enabled: !!(params.projectId || params.featureId),
    staleTime: 30_000,
  });
}

export function useEpic(id: string) {
  return useQuery({
    queryKey: ["epic", id],
    queryFn: () => fetchEpic(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export interface CreateEpicInput {
  projectId: string;
  featureId?: string;
  title: string;
  description?: string;
  status?: string;
  tags?: string[];
}

export function useCreateEpic(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEpicInput) => {
      const res = await fetch("/api/epics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create epic");
      }
      const { data } = await res.json();
      return data as EpicWithMeta;
    },
    onSuccess: (epic) => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      if (epic.featureId)
        queryClient.invalidateQueries({ queryKey: ["feature", epic.featureId] });
    },
  });
}

export function useUpdateEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<Epic>) => {
      const res = await fetch(`/api/epics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update epic");
      }
      const { data } = await res.json();
      return data as EpicWithMeta;
    },
    onSuccess: (epic) => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
      queryClient.invalidateQueries({ queryKey: ["epic", epic.id] });
    },
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/epics/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete epic");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epics"] });
    },
  });
}

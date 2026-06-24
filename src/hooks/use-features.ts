"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Feature, Epic } from "@prisma/client";

export type FeatureWithCounts = Feature & {
  _count: { epics: number };
};

export type FeatureWithEpics = Feature & {
  epics: (Epic & { _count: { userStories: number } })[];
};

export interface FeatureFilters {
  status?: string;
  priority?: string;
  search?: string;
}

async function fetchFeatures(
  projectId: string,
  filters: FeatureFilters
): Promise<FeatureWithCounts[]> {
  const params = new URLSearchParams({ projectId });
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.search) params.set("search", filters.search);

  const res = await fetch(`/api/features?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch features");
  const { data } = await res.json();
  return data;
}

async function fetchFeature(id: string): Promise<FeatureWithEpics> {
  const res = await fetch(`/api/features/${id}`);
  if (!res.ok) throw new Error("Failed to fetch feature");
  const { data } = await res.json();
  return data;
}

export function useFeatures(projectId: string, filters: FeatureFilters = {}) {
  return useQuery({
    queryKey: ["features", projectId, filters],
    queryFn: () => fetchFeatures(projectId, filters),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useFeature(id: string) {
  return useQuery({
    queryKey: ["feature", id],
    queryFn: () => fetchFeature(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export interface CreateFeatureInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: string;
  source?: string;
  businessValue?: number;
  effort?: number;
  requestedBy?: string;
  tags?: string[];
}

export function useCreateFeature(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFeatureInput) => {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create feature");
      }
      const { data } = await res.json();
      return data as FeatureWithCounts;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useUpdateFeature(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<Feature>) => {
      const res = await fetch(`/api/features/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update feature");
      }
      const { data } = await res.json();
      return data as FeatureWithCounts;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      queryClient.invalidateQueries({ queryKey: ["feature", updated.id] });
    },
  });
}

export function useDeleteFeature(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/features/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete feature");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

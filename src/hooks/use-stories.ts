"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserStory, AcceptanceCriteria } from "@prisma/client";

export type StoryWithCriteria = UserStory & {
  acceptanceCriteria: AcceptanceCriteria[];
};

export interface AcceptanceCriteriaInput {
  description: string;
  type?: string;
  given?: string;
  when?: string;
  then?: string;
  isCompleted?: boolean;
}

export interface CreateStoryInput {
  epicId: string;
  title: string;
  persona?: string;
  action?: string;
  benefit?: string;
  status?: string;
  type?: string;
  storyPoints?: number;
  priority?: number;
  sprint?: string;
  notes?: string;
  tags?: string[];
  acceptanceCriteria?: AcceptanceCriteriaInput[];
}

export function useCreateStory(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStoryInput) => {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create story");
      }
      const { data } = await res.json();
      return data as StoryWithCriteria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epic", epicId] });
      queryClient.invalidateQueries({ queryKey: ["epics"] });
    },
  });
}

export function useUpdateStory(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<CreateStoryInput>) => {
      const res = await fetch(`/api/stories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to update story");
      }
      const { data } = await res.json();
      return data as StoryWithCriteria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epic", epicId] });
    },
  });
}

export function useDeleteStory(epicId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/stories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to delete story");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epic", epicId] });
      queryClient.invalidateQueries({ queryKey: ["epics"] });
    },
  });
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkspaceSession {
  activeProjectId: string | null;
  activeProjectName: string | null;
  activeRoadmapId: string | null;
  activeSprint: string | null;
  activeEpicId: string | null;
  viewMode: "features" | "epics" | "stories" | "roadmap";
}

interface WorkspaceStore extends WorkspaceSession {
  setActiveProject: (id: string, name: string) => void;
  setActiveRoadmap: (id: string | null) => void;
  setActiveSprint: (sprint: string | null) => void;
  setActiveEpic: (id: string | null) => void;
  setViewMode: (mode: WorkspaceSession["viewMode"]) => void;
  clearProject: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeProjectName: null,
      activeRoadmapId: null,
      activeSprint: null,
      activeEpicId: null,
      viewMode: "features",

      setActiveProject: (id, name) =>
        set({ activeProjectId: id, activeProjectName: name }),
      setActiveRoadmap: (id) => set({ activeRoadmapId: id }),
      setActiveSprint: (sprint) => set({ activeSprint: sprint }),
      setActiveEpic: (id) => set({ activeEpicId: id }),
      setViewMode: (mode) => set({ viewMode: mode }),
      clearProject: () =>
        set({
          activeProjectId: null,
          activeProjectName: null,
          activeRoadmapId: null,
          activeSprint: null,
          activeEpicId: null,
          viewMode: "features",
        }),
    }),
    {
      name: "productpilot-workspace",
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        activeProjectName: state.activeProjectName,
        activeRoadmapId: state.activeRoadmapId,
        activeSprint: state.activeSprint,
      }),
    }
  )
);

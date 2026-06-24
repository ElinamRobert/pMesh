import { create } from "zustand";

interface AIAssistantStore {
  isOpen: boolean;
  conversationId: string | null;
  isStreaming: boolean;
  partialMessage: string;
  usedMemoryIds: string[];

  open: () => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: string | null) => void;
  setIsStreaming: (v: boolean) => void;
  setPartialMessage: (updater: string | ((prev: string) => string)) => void;
  setUsedMemoryIds: (ids: string[]) => void;
  resetStream: () => void;
}

export const useAIAssistantStore = create<AIAssistantStore>((set) => ({
  isOpen: true,
  conversationId: null,
  isStreaming: false,
  partialMessage: "",
  usedMemoryIds: [],

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setConversationId: (id) => set({ conversationId: id }),
  setIsStreaming: (v) => set({ isStreaming: v }),
  setPartialMessage: (updater) =>
    set((s) => ({
      partialMessage:
        typeof updater === "function" ? updater(s.partialMessage) : updater,
    })),
  setUsedMemoryIds: (ids) => set({ usedMemoryIds: ids }),
  resetStream: () => set({ isStreaming: false, partialMessage: "" }),
}));

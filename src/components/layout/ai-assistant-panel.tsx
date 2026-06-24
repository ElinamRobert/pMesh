"use client";

import { useAIAssistantStore } from "@/stores/ai-assistant.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { Brain, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIPanel } from "@/components/ai/ai-panel";

export function AIAssistantPanel() {
  const { isOpen, close, toggle } = useAIAssistantStore();
  const { activeProjectId, activeProjectName } = useWorkspaceStore();

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="flex h-full w-12 flex-col items-center justify-start gap-2 border-l border-border bg-sidebar pt-4 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        title="Open AI Assistant"
      >
        <Brain className="h-5 w-5" />
        <span
          className="text-xs font-medium mt-2 text-muted-foreground"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          AI Assistant
        </span>
      </button>
    );
  }

  return (
    <aside className="flex h-screen w-96 flex-col border-l border-border bg-sidebar">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-sidebar-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
          {activeProjectName && (
            <span className="text-xs text-muted-foreground">
              · {activeProjectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggle}
            title="Minimize"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeProjectId ? (
          <AIPanel projectId={activeProjectId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent">
              <Brain className="h-6 w-6 text-sidebar-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No project selected</p>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                Select a project to start working with your AI co-pilot.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

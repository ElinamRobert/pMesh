"use client";

import { useAIAssistantStore } from "@/stores/ai-assistant.store";
import { useWorkspaceStore } from "@/stores/workspace.store";
import { cn } from "@/lib/utils";
import { Brain, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIAssistantPanel() {
  const { isOpen, close, toggle } = useAIAssistantStore();
  const { activeProjectName, activeSprint } = useWorkspaceStore();

  if (!isOpen) {
    return (
      <button
        onClick={toggle}
        className="flex h-full w-12 flex-col items-center justify-start gap-2 border-l border-border bg-sidebar pt-4 text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        title="Open AI Assistant"
      >
        <Brain className="h-5 w-5" />
        <span
          className="text-xs font-medium [writing-mode:vertical-lr] rotate-180 mt-2 text-muted-foreground"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          AI Assistant
        </span>
      </button>
    );
  }

  return (
    <aside className="flex h-screen w-96 flex-col border-l border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-sidebar-primary" />
          <span className="text-sm font-semibold">AI Assistant</span>
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

      {/* Context badge */}
      {(activeProjectName || activeSprint) && (
        <div className="border-b border-border px-4 py-2">
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-1.5 text-xs text-sidebar-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {activeSprint && <span>{activeSprint}</span>}
            {activeSprint && activeProjectName && <span>·</span>}
            {activeProjectName && (
              <span className="text-sidebar-foreground/70 truncate">
                {activeProjectName}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent">
            <Brain className="h-6 w-6 text-sidebar-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {activeProjectName
                ? `Ready for ${activeProjectName}`
                : "No project selected"}
            </p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              {activeProjectName
                ? "Ask me to generate features, decompose epics, write user stories, or explain decisions."
                : "Select a project to start working with your AI co-pilot."}
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="relative">
          <textarea
            className={cn(
              "w-full resize-none rounded-md border border-input bg-background px-3 py-2",
              "text-sm placeholder:text-muted-foreground focus-visible:outline-none",
              "focus-visible:ring-1 focus-visible:ring-ring min-h-[80px]"
            )}
            placeholder={
              activeProjectName
                ? "Ask anything… (⌘↵ to send)"
                : "Select a project to begin"
            }
            disabled={!activeProjectName}
          />
        </div>
        <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
          AI memory active · Claude
        </p>
      </div>
    </aside>
  );
}

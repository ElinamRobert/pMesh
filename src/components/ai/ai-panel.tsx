"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles, RotateCcw } from "lucide-react";
import { useAIChat } from "@/hooks/use-ai-chat";
import { AIMessageBubble } from "./ai-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  projectId: string;
}

const STARTERS = [
  "What features are in progress?",
  "Help me write a user story for authentication",
  "What epics don't have acceptance criteria?",
  "Summarize this project's status",
];

export function AIPanel({ projectId }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isStreaming, error, sendMessage, stopStreaming, clearMessages } =
    useAIChat({ projectId });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">ProductPilot AI</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearMessages}
            title="New conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-center text-sm text-muted-foreground">
              Ask me anything about your product
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <AIMessageBubble key={msg.id} message={msg} />
            ))}
            {error && (
              <p className="text-center text-xs text-destructive">{error}</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your product…"
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
              onClick={stopStreaming}
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

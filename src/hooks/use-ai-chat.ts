"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

interface UseAIChatOptions {
  projectId: string;
  conversationId?: string;
  onConversationId?: (id: string) => void;
}

export function useAIChat({
  projectId,
  conversationId: initialConversationId,
  onConversationId,
}: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || !content.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      const pendingMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        pending: true,
      };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      setIsStreaming(true);
      setError(null);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, projectId, conversationId }),
          signal: abort.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantMsgId = pendingMsg.id;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "conversation_id") {
                setConversationId(event.conversationId);
                onConversationId?.(event.conversationId);
              } else if (event.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === pendingMsg.id
                      ? { ...m, content: m.content + event.text }
                      : m
                  )
                );
              } else if (event.type === "done") {
                assistantMsgId = event.messageId ?? pendingMsg.id;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === pendingMsg.id
                      ? { ...m, id: assistantMsgId, pending: false }
                      : m
                  )
                );
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, content: `Error: ${msg}`, pending: false }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, projectId, conversationId, onConversationId]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  }, []);

  return {
    messages,
    conversationId,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}

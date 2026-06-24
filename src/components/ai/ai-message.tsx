"use client";

import { type ChatMessage } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessage;
}

export function AIMessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? "U" : "AI"}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-muted text-foreground"
        )}
      >
        {message.pending && !message.content ? (
          <span className="flex gap-1">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce [animation-delay:0.15s]">·</span>
            <span className="animate-bounce [animation-delay:0.3s]">·</span>
          </span>
        ) : (
          <MessageContent content={message.content} pending={message.pending} />
        )}
      </div>
    </div>
  );
}

function MessageContent({
  content,
  pending,
}: {
  content: string;
  pending?: boolean;
}) {
  const lines = content.split("\n");

  return (
    <div className="whitespace-pre-wrap">
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
      {pending && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
      )}
    </div>
  );
}

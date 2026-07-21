import Link from "next/link";
import { Sparkle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CoachCta } from "@/features/coach/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  cta?: CoachCta;
  followUpQuestion?: string | null;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      {isAssistant && (
        <span
          aria-hidden
          className="bg-foreground text-background mb-1 flex size-7 shrink-0 items-center justify-center rounded-full"
        >
          <Sparkle className="size-3.5" />
        </span>
      )}

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]",
          isAssistant ? "items-start" : "items-end",
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm wrap-break-word",
            isAssistant
              ? "bg-muted text-foreground rounded-bl-sm"
              : "bg-foreground text-background rounded-br-sm",
          )}
        >
          {message.text}
        </div>

        {message.followUpQuestion && (
          <p className="text-muted-foreground text-sm italic">{message.followUpQuestion}</p>
        )}

        {message.cta && (
          <Button asChild size="sm" className="mt-1">
            <Link href={message.cta.href}>{message.cta.label}</Link>
          </Button>
        )}

        <time
          dateTime={message.timestamp.toISOString()}
          className="text-muted-foreground px-1 text-xs"
        >
          {formatTime(message.timestamp)}
        </time>
      </div>
    </div>
  );
}

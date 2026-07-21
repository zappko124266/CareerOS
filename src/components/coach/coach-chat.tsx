"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkle, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessageBubble, type ChatMessage } from "@/components/coach/chat-message-bubble";
import { ChatSuggestionChips } from "@/components/coach/chat-suggestion-chips";
import type { CoachCta } from "@/features/coach/types";

const MAX_HISTORY_TURNS = 10;
const FALLBACK_ERROR_TEXT = "Sorry, something went wrong on my end. Please try again.";

interface CoachMessageMeta {
  cta?: CoachCta;
  followUpQuestion?: string | null;
}

function parseMetaHeader(response: Response): CoachMessageMeta {
  const raw = response.headers.get("X-Coach-Meta");
  if (!raw) return {};
  try {
    return JSON.parse(decodeURIComponent(raw)) as CoachMessageMeta;
  } catch {
    return {};
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-hidden>
      <span className="bg-foreground text-background mb-1 flex size-7 shrink-0 items-center justify-center rounded-full">
        <Sparkle className="size-3.5" />
      </span>
      <div className="bg-muted flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
        <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
        <span className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full" />
      </div>
    </div>
  );
}

let messageIdCounter = 0;
function nextMessageId() {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function CoachChat({ name, targetRole }: { name: string; targetRole: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    // Session-only memory (Step 5) — the last 10 turns already in state,
    // sent as context for this one request. Never persisted anywhere.
    const history = messagesRef.current
      .slice(-MAX_HISTORY_TURNS)
      .map((message) => ({ role: message.role, text: message.text }));

    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const assistantId = nextMessageId();

    try {
      const response = await fetch("/api/coach/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const meta = parseMetaHeader(response);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedText = "";
      let started = false;

      // Real token-by-token streaming — no polling, no artificial delay.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulatedText += decoder.decode(value, { stream: true });

        if (!started) {
          started = true;
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              text: accumulatedText,
              timestamp: new Date(),
              cta: meta.cta,
              followUpQuestion: meta.followUpQuestion ?? null,
            },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, text: accumulatedText } : message,
            ),
          );
        }
      }

      if (!started) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", text: FALLBACK_ERROR_TEXT, timestamp: new Date() },
        ]);
      }
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", text: FALLBACK_ERROR_TEXT, timestamp: new Date() },
      ]);
    }

    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[32rem] flex-col">
      <div className="flex flex-col items-center gap-1 pb-6 text-center">
        <span className="bg-foreground text-background flex size-10 items-center justify-center rounded-full">
          <Sparkle className="size-5" />
        </span>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          👋 Hi{name ? `, ${name}` : ""}.
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          {targetRole
            ? `I'm your AI Career Coach. Let's get you hired as a ${targetRole}.`
            : "I'm your AI Career Coach. I'll help you get hired faster."}
        </p>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with your AI Career Coach"
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
            <p className="text-muted-foreground text-sm">
              Not sure where to start? Try one of these:
            </p>
            <ChatSuggestionChips onSelect={send} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-1 py-2 sm:px-2">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="border-border bg-background mt-4 flex items-end gap-2 rounded-2xl border p-2 shadow-sm"
      >
        <Textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your career..."
          aria-label="Message your AI Career Coach"
          rows={1}
          className="max-h-40 min-h-10 flex-1 resize-none border-none py-2 shadow-none focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isTyping}
          aria-label="Send message"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}

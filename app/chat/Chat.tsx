"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getOrCreateRoomId(): string {
  const key = "bismillah-chat-room";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function ToolPartView({
  part,
}: {
  part: UIMessage["parts"][number];
}) {
  if (!isToolUIPart(part)) return null;
  const toolName = getToolName(part);

  if (part.state === "output-available") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-600">
        <div className="mb-1 font-sans font-medium text-slate-800">
          {toolName} · done
        </div>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      </div>
    );
  }

  if (part.state === "input-available" || part.state === "input-streaming") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Running {toolName}…
      </div>
    );
  }

  return null;
}

function ChatInner() {
  const [connected, setConnected] = useState(false);
  const [input, setInput] = useState("");
  const [manualStopped, setManualStopped] = useState(false);
  const [roomId] = useState(getOrCreateRoomId);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agent = useAgent({
    agent: "ChatAgent",
    name: roomId,
    onOpen: useCallback(() => setConnected(true), []),
    onClose: useCallback(() => setConnected(false), []),
    onError: useCallback((error: Event) => {
      console.error("WebSocket error:", error);
    }, []),
  });

  const { messages, sendMessage, clearHistory, stop, status } = useAgentChat({
    agent,
    onToolCall: async (event) => {
      if (
        "addToolOutput" in event &&
        event.toolCall.toolName === "getUserTimezone"
      ) {
        event.addToolOutput({
          toolCallId: event.toolCall.toolCallId,
          output: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime: new Date().toLocaleTimeString(),
          },
        });
      }
    },
  });

  const isStreaming =
    !manualStopped && (status === "streaming" || status === "submitted");

  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      setManualStopped(false);
    }
  }, [status]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }, [input, isStreaming, sendMessage]);

  const prompts = [
    "What's the weather in Makkah?",
    "What timezone am I in?",
    "Calculate 42 * 17",
  ];

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-emerald-700">
              ← Bismillah
            </Link>
            <h1 className="text-lg font-semibold">Agent chat</h1>
            <Badge
              className={cn(
                connected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              )}
            >
              {connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={clearHistory}>
            Clear
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="mb-4 text-slate-600">
                Bismillah — ask about weather, math, or your timezone.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {prompts.map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    disabled={isStreaming || !connected}
                    onClick={() =>
                      sendMessage({
                        role: "user",
                        parts: [{ type: "text", text: p }],
                      })
                    }
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message: UIMessage) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className="space-y-2">
                {message.parts.filter(isToolUIPart).map((part) => (
                  <ToolPartView key={part.toolCallId} part={part} />
                ))}
                {message.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => {
                    const text = (part as { type: "text"; text: string }).text;
                    if (!text) return null;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed",
                            isUser
                              ? "rounded-br-md bg-emerald-700 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                          )}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <form
          className="mx-auto flex max-w-3xl items-end gap-3 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            disabled={!connected || isStreaming}
            placeholder="Send a message…"
            className="max-h-40 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {isStreaming ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                stop();
                setManualStopped(true);
              }}
            >
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim() || !connected}>
              Send
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-slate-500">
          Loading chat…
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}

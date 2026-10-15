"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { postChat, type ChatTurn } from "@/lib/api";

const SUGGESTIONS = [
  "How many on bench?",
  "Who is critical (91+ days)?",
  "Top skills on bench",
  "IFB pipeline status",
  "Headcount by location",
];

type Bubble = { id: number; role: "user" | "assistant"; content: string };

let uid = 0;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([
    {
      id: uid++,
      role: "assistant",
      content:
        "Hi! I can answer questions about your workforce data — headcount, aging, skills, pipeline, locations. Try one of the suggestions below.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    const userBubble: Bubble = { id: uid++, role: "user", content };
    const nextMessages = [...messages, userBubble];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const history: ChatTurn[] = nextMessages
        .filter((m) => m.id !== 0) // skip intro assistant note? keep it, harmless
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }));
      const res = await postChat(content, history);
      setMessages((prev) => [...prev, { id: uid++, role: "assistant", content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: uid++, role: "assistant", content: err instanceof Error ? err.message : "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 1000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--brand-primary, #6366f1)",
          color: "#fff",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "6px 6px 16px #b0b8d8, -6px -6px 16px #ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform .15s",
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Data assistant"
          style={{
            position: "fixed",
            right: 20,
            bottom: 88,
            zIndex: 1000,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(520px, calc(100vh - 140px))",
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
            background: "#e8eaf6",
            boxShadow: "10px 10px 24px #b0b8d8, -10px -10px 24px #ffffff",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              background: "var(--brand-primary, #6366f1)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>✨</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Data Assistant</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>Ask anything about your workforce data</div>
            </div>
            <button
              type="button"
              onClick={() => setMessages(messages.slice(0, 1))}
              style={{
                border: "none",
                background: "rgba(255,255,255,.18)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 999,
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "9px 13px",
                  borderRadius: 14,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: m.role === "user" ? "var(--brand-primary, #6366f1)" : "#f2f4fb",
                  color: m.role === "user" ? "#fff" : "#1e293b",
                  boxShadow:
                    m.role === "user"
                      ? "inset 1px 1px 3px rgba(0,0,0,.18)"
                      : "inset 2px 2px 5px #d4d9ec, inset -2px -2px 5px #ffffff",
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "user" ? 14 : 4,
                }}
              >
                {m.content}
              </div>
            ))}

            {busy && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "9px 14px",
                  borderRadius: 14,
                  background: "#f2f4fb",
                  fontSize: 12,
                  color: "#64748b",
                  boxShadow: "inset 2px 2px 5px #d4d9ec, inset -2px -2px 5px #ffffff",
                }}
              >
                Thinking<span style={{ opacity: 0.6 }}>.</span>
                <span style={{ opacity: 0.4 }}>.</span>
                <span style={{ opacity: 0.2 }}>.</span>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && !busy && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  style={{
                    border: "none",
                    background: "#eef0fa",
                    color: "#4f46e5",
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "6px 10px",
                    borderRadius: 999,
                    cursor: "pointer",
                    boxShadow: "2px 2px 5px #d4d9ec, -2px -2px 5px #ffffff",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={onSubmit}
            style={{
              display: "flex",
              gap: 8,
              padding: 12,
              borderTop: "1px solid rgba(163,177,198,.25)",
              background: "#e8eaf6",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about bench data…"
              maxLength={2000}
              disabled={busy}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: "#e8eaf6",
                boxShadow: "inset 3px 3px 7px #b0b8d8, inset -3px -3px 7px #ffffff",
                fontSize: 13,
                color: "#1e293b",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              style={{
                border: "none",
                background: busy || !input.trim() ? "#c7cdf0" : "var(--brand-primary, #6366f1)",
                color: "#fff",
                borderRadius: 10,
                width: 44,
                fontSize: 16,
                cursor: busy || !input.trim() ? "not-allowed" : "pointer",
                boxShadow: "3px 3px 7px #b0b8d8, -3px -3px 7px #ffffff",
              }}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}

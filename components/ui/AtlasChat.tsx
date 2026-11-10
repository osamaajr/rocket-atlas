"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ROCKET_BY_ID, type RocketId } from "@/lib/rockets";
import { useAtlas } from "@/lib/store";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  rocket: RocketId | null;
}

const STORAGE_KEY = "rocket-atlas-chat-v1";
const WELCOME: Msg = {
  id: "welcome",
  role: "assistant",
  content:
    "Let's explore these rockets. I'm **Atlas**, your guide to the exhibit — ask me about their history, engines, missions or how they compare. When you select a rocket, I'll know which one you're looking at.",
  rocket: null,
};

const SUGGESTIONS: Record<RocketId | "all", string[]> = {
  all: ["Which of these flew first?", "How do they compare in size?", "What is this exhibit?"],
  "mercury-redstone": ["Who flew on it?", "Why couldn't it reach orbit?", "What was the four-inch flight?"],
  "gemini-titan": ["Why was Gemini important for Apollo?", "What fuel did the Titan II use?", "Who did the first spacewalk?"],
  "saturn-v": ["How powerful were the F-1 engines?", "Why did it need three stages?", "Which missions flew on it?"],
};

/* --- tiny, safe markdown: paragraphs, bullet lists, **bold**, _italic_ --- */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""))}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

export default function AtlasChat() {
  const open = useAtlas((s) => s.chatOpen);
  const setOpen = useAtlas((s) => s.setChatOpen);
  const selected = useAtlas((s) => s.selected);
  const pending = useAtlas((s) => s.pendingQuestion);
  const clearPending = useAtlas((s) => s.clearPending);
  const launching = useAtlas((s) => s.launch.status !== "idle");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  // restore + persist conversation
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Msg[];
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch {}
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || busy) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 320);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const ctx = useAtlas.getState().selected;
      const user: Msg = { id: crypto.randomUUID(), role: "user", content: q, rocket: ctx };
      const bot: Msg = { id: crypto.randomUUID(), role: "assistant", content: "", rocket: ctx };
      const history = [...messages.filter((m) => m.id !== "welcome"), user];
      setMessages((m) => [...m, user, bot]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedId: ctx, messages: history.map(({ role, content }) => ({ role, content })) }),
        });
        setMode(res.headers.get("X-Atlas-Mode"));
        if (!res.body) throw new Error("No response");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          const snapshot = acc;
          setMessages((m) => m.map((x) => (x.id === bot.id ? { ...x, content: snapshot } : x)));
        }
        if (!acc.trim()) throw new Error("Empty");
      } catch {
        setMessages((m) =>
          m.map((x) => (x.id === bot.id ? { ...x, content: "I couldn't reach the guide just now — please try again in a moment." } : x)),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, messages],
  );

  useEffect(() => {
    if (pending && open && !busy) {
      send(pending);
      clearPending();
    }
  }, [pending, open, busy, send, clearPending]);

  const r = selected ? ROCKET_BY_ID[selected] : null;
  const suggestions = SUGGESTIONS[selected ?? "all"];

  return (
    <>
      <button
        className={`atlas-fab ${open || launching ? "is-hidden" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open the Atlas guide"
      >
        <span className="fab-dot" />
        Ask Atlas
        {r && <small>about {r.shortName}</small>}
      </button>

      <aside className={`atlas ${open ? "is-open" : ""} ${launching ? "is-launching" : ""}`} aria-hidden={!open}>
        <header className="atlas-head">
          <div className="atlas-id">
            <span className="atlas-mark">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeOpacity=".6" />
                <ellipse cx="9" cy="9" rx="7.5" ry="2.8" transform="rotate(-32 9 9)" stroke="var(--accent)" />
              </svg>
            </span>
            <div>
              <strong>Atlas</strong>
              <small>Your rocket guide</small>
            </div>
          </div>
          <span className="ctx-chip">{r ? r.name : "All three rockets"}</span>
          <button
            className="icon-btn"
            title="Clear conversation"
            onClick={() => {
              setMessages([WELCOME]);
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {}
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
              <path d="M2.5 4h10M6 4V2.5h3V4M3.8 4l.7 8.5h6l.7-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="icon-btn" title="Close" onClick={() => setOpen(false)}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
              <path d="M3.5 3.5l8 8M11.5 3.5l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="context-row" title="Atlas sends this context with every question">
          <span>App purpose</span>
          <span>Rocket history</span>
          <span className={r ? "on" : ""}>{r ? `Selected · ${r.shortName}` : "No selection"}</span>
        </div>

        <div className="atlas-list" ref={listRef}>
          {messages.map((m, i) => {
            const prevUser = messages.slice(0, i).reverse().find((x) => x.role === "user");
            const showCtx = m.role === "user" && (prevUser ? prevUser.rocket !== m.rocket : m.rocket !== null);
            return (
              <Fragment key={m.id}>
                {showCtx && <div className="ctx-divider mono">Now viewing · {m.rocket ? ROCKET_BY_ID[m.rocket].name : "All rockets"}</div>}
                <div className={`msg ${m.role}`}>
                  {m.role === "assistant" && !m.content ? (
                    <span className="typing">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : m.role === "assistant" ? (
                    <Markdown text={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="suggest">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="atlas-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            placeholder={r ? `Ask about the ${r.name}…` : "Ask about the rockets…"}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <p className="atlas-foot mono">
          {mode === "offline" ? "Archive mode · answers from the exhibit's verified data" : "Rocket history, within reach"}
        </p>
      </aside>
    </>
  );
}

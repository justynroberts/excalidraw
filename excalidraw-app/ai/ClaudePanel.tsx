import { useCallback, useEffect, useRef, useState } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { openForkNotice } from "../components/ForkNotice";

import {
  AI_BACKEND_URL,
  setAssistantBusy,
  useBridgeState,
} from "./bridgeClient";
import { streamAssistant } from "./assistantClient";
import { LibraryTemplates } from "./LibraryTemplates";

import "./ClaudePanel.scss";

import type { AssistantMessage } from "./assistantClient";

type ToolRow = {
  id: string;
  summary: string;
  state: "running" | "done" | "error";
};

type Turn =
  | { kind: "user"; text: string }
  | {
      kind: "assistant";
      text: string;
      tools: ToolRow[];
      thinking: boolean;
      pending: boolean;
      error?: string;
    };

const QUICK_ACTIONS: { label: string; prompt: string; prefill?: boolean }[] = [
  { label: "Draw…", prompt: "Draw ", prefill: true },
  { label: "Explain", prompt: "Explain what this drawing shows, briefly." },
  {
    label: "Critique",
    prompt:
      "Look at the canvas, name the top three clarity or layout problems, then fix them.",
  },
  {
    label: "Extend",
    prompt:
      "Extend the diagram (or the selected part) with the next logical steps, matching its style.",
  },
  {
    label: "Tidy",
    prompt:
      "Tidy the layout: align shapes, even out spacing, keep arrows connected. Don't change the content.",
  },
  {
    label: "Colour-code",
    prompt:
      "Colour-code the diagram by role or type and add a small legend beside it.",
  },
];

const MCP_URL = `${AI_BACKEND_URL}/mcp`;
const CLAUDE_CODE_CMD = `claude mcp add --transport http sketchbench ${MCP_URL}`;

const STATUS_TEXT = {
  online: "live",
  connecting: "connecting",
  offline: "server offline",
} as const;

const METHOD_LABEL: Record<string, string> = {
  getScene: "read scene",
  addElements: "add",
  updateElements: "update",
  deleteElements: "delete",
  addMermaid: "mermaid",
  exportImage: "snapshot",
  focusView: "focus",
  clearCanvas: "clear",
};

/** Text sent back as history for an assistant turn. */
const turnToMessage = (turn: Turn): AssistantMessage | null => {
  if (turn.kind === "user") {
    return { role: "user", content: turn.text };
  }
  if (turn.pending) {
    return null;
  }
  const actions = turn.tools.map((t) => t.summary).join("; ");
  const content = [turn.text.trim(), actions && `[canvas actions: ${actions}]`]
    .filter(Boolean)
    .join("\n");
  return content ? { role: "assistant", content } : null;
};

const AboutButton = () => (
  <button
    type="button"
    className="claude-panel__icon-btn"
    aria-label="About this app"
    onClick={openForkNotice}
  >
    i
  </button>
);

const CopyLine = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="claude-panel__copy">
      <code>{text}</code>
      <button
        type="button"
        className="claude-panel__text-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          } catch (error) {
            console.warn("[claude-panel] clipboard write failed", error);
          }
        }}
      >
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
};

export const ClaudePanel = ({
  api,
}: {
  api: ExcalidrawImperativeAPI | null;
}) => {
  const bridge = useBridgeState();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLast = (
    fn: (turn: Extract<Turn, { kind: "assistant" }>) => void,
  ) =>
    setTurns((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.kind === "assistant") {
        const copy = { ...last, tools: [...last.tools] };
        fn(copy);
        next[next.length - 1] = copy;
      }
      return next;
    });

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || busy || !api) {
        return;
      }
      const history = [...turns, { kind: "user", text: prompt } as Turn];
      const messages = history
        .map(turnToMessage)
        .filter((m): m is AssistantMessage => m !== null);

      setTurns([
        ...history,
        {
          kind: "assistant",
          text: "",
          tools: [],
          thinking: false,
          pending: true,
        },
      ]);
      setDraft("");
      setBusy(true);
      setAssistantBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamAssistant({
          messages,
          tabId: bridge.tabId,
          selectedIds: Object.keys(api.getAppState().selectedElementIds),
          signal: controller.signal,
          onEvent: (event) => {
            switch (event.type) {
              case "content":
                updateLast((t) => {
                  t.text += event.delta;
                  t.thinking = false;
                });
                break;
              case "status":
                updateLast((t) => {
                  t.thinking = true;
                });
                break;
              case "tool":
                updateLast((t) => {
                  t.thinking = false;
                  const row = t.tools.find((r) => r.id === event.id);
                  if (row) {
                    row.state = event.state;
                  } else {
                    t.tools.push({
                      id: event.id,
                      summary: event.summary,
                      state: event.state,
                    });
                  }
                });
                break;
              case "error":
                updateLast((t) => {
                  t.error = event.error.message;
                });
                break;
            }
          },
        });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("[claude-panel] assistant request failed", error);
          updateLast((t) => {
            t.error = error?.message || "Request failed";
          });
        }
      } finally {
        updateLast((t) => {
          t.pending = false;
          t.thinking = false;
          t.tools = t.tools.map((r) =>
            r.state === "running" ? { ...r, state: "error" } : r,
          );
        });
        setBusy(false);
        setAssistantBusy(false);
        abortRef.current = null;
      }
    },
    [api, busy, turns, bridge.tabId],
  );

  const externalActivity = bridge.activity
    .filter((a) => a.external)
    .slice(0, 6);
  const offline = bridge.status !== "online";

  return (
    <div className="claude-panel">
      <header className="claude-panel__head">
        <span className="claude-panel__title">AI</span>
        <span className="claude-panel__muted">Claude</span>
        <span
          className={`claude-panel__status claude-panel__status--${bridge.status}`}
          role="status"
        >
          <span className="claude-panel__dot" aria-hidden="true" />
          {STATUS_TEXT[bridge.status]}
        </span>
        {turns.length > 0 && !busy && (
          <button
            type="button"
            className="claude-panel__text-btn"
            onClick={() => setTurns([])}
          >
            new
          </button>
        )}
        <AboutButton />
      </header>

      <div className="claude-panel__log" ref={logRef} aria-live="polite">
        {turns.length === 0 && (
          <div className="claude-panel__intro">
            <p>
              Ask for a diagram, point at a selection, or have Claude look at
              the canvas and improve it. Every change is one undo away.
            </p>
            {offline && (
              <p className="claude-panel__warn">
                AI server not reachable at {AI_BACKEND_URL}. Run{" "}
                <code>yarn start:ai</code>.
              </p>
            )}
          </div>
        )}
        {turns.map((turn, index) =>
          turn.kind === "user" ? (
            <div
              key={index}
              className="claude-panel__turn claude-panel__turn--user"
            >
              <span className="claude-panel__prompt" aria-hidden="true">
                &gt;
              </span>
              <span>{turn.text}</span>
            </div>
          ) : (
            <div key={index} className="claude-panel__turn">
              {turn.tools.map((row) => (
                <div
                  key={row.id}
                  className={`claude-panel__tool claude-panel__tool--${row.state}`}
                >
                  <span className="claude-panel__tool-state">
                    {row.state === "running"
                      ? "···"
                      : row.state === "done"
                      ? "ok"
                      : "err"}
                  </span>
                  {row.summary}
                </div>
              ))}
              {turn.text && (
                <div className="claude-panel__text">{turn.text}</div>
              )}
              {turn.pending && !turn.text && turn.tools.length === 0 && (
                <div className="claude-panel__muted">
                  {turn.thinking ? "thinking" : "working"}
                </div>
              )}
              {turn.error && (
                <div className="claude-panel__error">{turn.error}</div>
              )}
            </div>
          ),
        )}
      </div>

      <LibraryTemplates api={api} />

      <div
        className="claude-panel__actions"
        role="group"
        aria-label="Quick actions"
      >
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="claude-panel__chip"
            disabled={busy || offline}
            onClick={() => {
              if (action.prefill) {
                setDraft(action.prompt);
                inputRef.current?.focus();
              } else {
                send(action.prompt);
              }
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      <form
        className="claude-panel__composer"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={3}
          placeholder="Draw a checkout flow with retries…"
          aria-label="Message Claude"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Keep keystrokes away from the editor's global shortcuts.
            event.stopPropagation();
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send(draft);
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            className="claude-panel__send"
            onClick={() => abortRef.current?.abort()}
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="claude-panel__send"
            disabled={!draft.trim() || offline}
          >
            Send
          </button>
        )}
      </form>

      <details className="claude-panel__mcp">
        <summary>
          MCP
          {externalActivity.length > 0 && (
            <span className="claude-panel__muted">
              {" "}
              · {externalActivity.length} recent call
              {externalActivity.length === 1 ? "" : "s"}
            </span>
          )}
        </summary>
        <p className="claude-panel__muted">
          Let Claude Code or Claude Desktop draw on this tab.
        </p>
        <CopyLine text={CLAUDE_CODE_CMD} />
        <p className="claude-panel__muted">
          Claude Desktop: see <code>ai-server/README.md</code> for the stdio
          config.
        </p>
        {externalActivity.length > 0 && (
          <ul className="claude-panel__activity">
            {externalActivity.map((a) => (
              <li key={a.id} className={a.ok ? "" : "claude-panel__error"}>
                <span>
                  {new Date(a.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                {METHOD_LABEL[a.method] ?? a.method}
                {a.ok ? "" : " failed"}
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
};

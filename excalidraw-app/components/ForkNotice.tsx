// "About Excalidraw-FL": says this is a fork, credits upstream Excalidraw, and
// asks people to support the original team via Excalidraw+. Shown once on
// first visit, then reachable from the main menu and the Claude panel.

import { useEffect, useRef, useSyncExternalStore } from "react";

import "./ForkNotice.scss";

const SEEN_KEY = "excalidraw-fl-notice-seen-v1";

const PLUS_URL = `${
  import.meta.env.VITE_APP_PLUS_LP
}/plus?utm_source=excalidraw-fl&utm_medium=app&utm_content=fork_notice`;
const UPSTREAM_URL = "https://github.com/excalidraw/excalidraw";
const FORK_URL = "https://github.com/justynroberts/excalidraw";

let open = false;
const listeners = new Set<() => void>();
const setOpen = (next: boolean) => {
  open = next;
  listeners.forEach((listener) => listener());
};

export const openForkNotice = () => setOpen(true);

const hasSeenNotice = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

const markNoticeSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // storage unavailable (private mode); the notice just shows again
  }
};

export const ForkNotice = () => {
  const isOpen = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => open,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!hasSeenNotice()) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    // Fall back to the `open` attribute where the dialog API is missing
    // (jsdom in tests, some embedded webviews).
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [isOpen]);

  const close = () => {
    markNoticeSeen();
    setOpen(false);
  };

  return (
    <dialog
      ref={dialogRef}
      className="fork-notice"
      aria-labelledby="fork-notice-title"
      // Escape fires `cancel`; keep React state in sync with the native dialog.
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          close();
        }
      }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="fork-notice__body">
        <p className="fork-notice__eyebrow">Fork notice</p>
        <h2 id="fork-notice-title">Excalidraw-FL</h2>
        <p>
          Excalidraw-FL is a fork of the original{" "}
          <a href={UPSTREAM_URL} target="_blank" rel="noopener">
            Excalidraw
          </a>
          , with MCP, AI and additional features:
        </p>
        <ul>
          <li>Claude canvas assistant that draws, edits and critiques</li>
          <li>MCP server, so Claude Code and Claude Desktop can draw here</li>
          <li>Working text-to-diagram and wireframe-to-code</li>
          <li>Seven extra handwritten and architect fonts</li>
        </ul>

        <div className="fork-notice__support">
          <p>
            Excalidraw is made by the Excalidraw team and is free and open
            source. If you find it useful, please support the people who built
            it by subscribing to Excalidraw+.
          </p>
          <a
            className="fork-notice__primary"
            href={PLUS_URL}
            target="_blank"
            rel="noopener"
          >
            Support Excalidraw+
          </a>
        </div>

        <p className="fork-notice__fine">
          Based on Excalidraw © Excalidraw, MIT License. Not affiliated with or
          endorsed by the Excalidraw team.{" "}
          <a href={FORK_URL} target="_blank" rel="noopener">
            Fork source
          </a>{" "}
          · Made by{" "}
          <a href="https://fintonlabs.com" target="_blank" rel="noopener">
            FintonLabs
          </a>
        </p>

        <button type="button" className="fork-notice__close" onClick={close}>
          Start drawing
        </button>
      </div>
    </dialog>
  );
};

// Browser end of the AI server bridge. One WebSocket per tab: it receives tool
// calls (from MCP clients or the in-app assistant), runs them against the
// canvas, and replies. State is exposed through a tiny external store.

import { randomId } from "@excalidraw/common";
import { useSyncExternalStore } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { CANVAS_METHODS } from "./canvasOps";

export type BridgeStatus = "offline" | "connecting" | "online";

export type BridgeActivity = {
  id: string;
  method: string;
  ok: boolean;
  at: number;
  /** true when the call came from an external MCP client, not the panel */
  external: boolean;
};

type BridgeState = {
  status: BridgeStatus;
  tabId: string;
  activity: readonly BridgeActivity[];
};

const MAX_ACTIVITY = 30;
const RECONNECT_MAX_MS = 15_000;

export const AI_BACKEND_URL = import.meta.env.VITE_APP_AI_BACKEND as string;

const getTabId = () => {
  const key = "excalidraw-ai-tab-id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }
    const id = randomId();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return randomId();
  }
};

let state: BridgeState = {
  status: "offline",
  tabId: getTabId(),
  activity: [],
};
const listeners = new Set<() => void>();

const setState = (next: Partial<BridgeState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

/** Calls issued by the in-app assistant, so they aren't shown as external. */
let assistantBusy = false;
export const setAssistantBusy = (busy: boolean) => {
  assistantBusy = busy;
};

export const useBridgeState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const startBridge = (api: ExcalidrawImperativeAPI) => {
  if (!AI_BACKEND_URL) {
    return () => {};
  }
  const wsURL = `${AI_BACKEND_URL.replace(/^http/, "ws")}/bridge`;
  let socket: WebSocket | null = null;
  let retryDelay = 1000;
  let retryTimer: number | undefined;
  let stopped = false;

  const onFocus = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "focus" }));
    }
  };

  const handleCall = async (msg: {
    id: string;
    method: string;
    params: Record<string, unknown>;
  }) => {
    const handler = CANVAS_METHODS[msg.method];
    let reply: Record<string, unknown>;
    try {
      if (!handler) {
        throw new Error(`Unknown canvas method: ${msg.method}`);
      }
      reply = { result: await handler(api, msg.params ?? {}) };
    } catch (error: any) {
      console.error("[ai-bridge] call failed", msg.method, error);
      reply = { error: error?.message || String(error) };
    }
    socket?.send(JSON.stringify({ type: "result", id: msg.id, ...reply }));
    setState({
      activity: [
        {
          id: msg.id,
          method: msg.method,
          ok: !("error" in reply),
          at: Date.now(),
          external: !assistantBusy,
        },
        ...state.activity,
      ].slice(0, MAX_ACTIVITY),
    });
  };

  const connect = () => {
    if (stopped) {
      return;
    }
    setState({ status: "connecting" });
    socket = new WebSocket(wsURL);

    socket.onopen = () => {
      retryDelay = 1000;
      socket?.send(
        JSON.stringify({
          type: "hello",
          tabId: state.tabId,
          title: document.title,
        }),
      );
      if (document.hasFocus()) {
        onFocus();
      }
      setState({ status: "online" });
    };
    socket.onmessage = (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "call") {
        handleCall(msg);
      }
    };
    socket.onclose = () => {
      socket = null;
      if (stopped) {
        return;
      }
      setState({ status: "offline" });
      retryTimer = window.setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX_MS);
    };
  };

  window.addEventListener("focus", onFocus);
  connect();

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    window.removeEventListener("focus", onFocus);
    socket?.close();
    setState({ status: "offline" });
  };
};

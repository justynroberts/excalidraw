// WebSocket bridge between this server and open Excalidraw tabs.
//
// The canvas only exists in the browser, so tool calls from MCP clients and the
// in-app assistant are relayed to a tab and its reply is awaited. Tabs report
// focus, and calls without an explicit tab go to the most recently focused one.

import { randomUUID } from "node:crypto";

import { WebSocketServer } from "ws";

const CALL_TIMEOUT_MS = 30_000;

export class CanvasBridge {
  constructor({ allowedOrigins, log }) {
    this.allowedOrigins = allowedOrigins;
    this.log = log;
    /** @type {Map<string, {socket: import("ws").WebSocket, lastActive: number, title: string}>} */
    this.tabs = new Map();
    this.pending = new Map();
    this.listeners = new Set();
    this.wss = new WebSocketServer({ noServer: true });
  }

  /** Attach to an http.Server's upgrade event on the given path. */
  attach(httpServer, path) {
    httpServer.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname !== path) {
        return;
      }
      if (!this.isAllowedOrigin(req.headers.origin)) {
        this.log("bridge: rejected origin", req.headers.origin);
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnect(ws));
    });
  }

  isAllowedOrigin(origin) {
    if (!origin) {
      return false;
    }
    return this.allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin,
    );
  }

  onConnect(socket) {
    let tabId = null;

    socket.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "hello": {
          tabId = String(msg.tabId || randomUUID());
          this.tabs.set(tabId, {
            socket,
            lastActive: Date.now(),
            title: String(msg.title || "Sketchbench"),
          });
          this.log(`bridge: tab ${tabId} connected (${this.tabs.size} open)`);
          this.emit();
          break;
        }
        case "focus": {
          const tab = tabId && this.tabs.get(tabId);
          if (tab) {
            tab.lastActive = Date.now();
          }
          break;
        }
        case "result": {
          const pending = this.pending.get(msg.id);
          if (!pending) {
            return;
          }
          this.pending.delete(msg.id);
          clearTimeout(pending.timer);
          if (msg.error) {
            pending.reject(new Error(msg.error));
          } else {
            pending.resolve(msg.result);
          }
          break;
        }
      }
    });

    socket.on("close", () => {
      if (tabId && this.tabs.get(tabId)?.socket === socket) {
        this.tabs.delete(tabId);
        this.log(`bridge: tab ${tabId} disconnected (${this.tabs.size} open)`);
        this.emit();
      }
    });
  }

  /** Current tab count, pushed to every tab so each can show MCP status. */
  emit() {
    const payload = JSON.stringify({ type: "status", tabs: this.tabs.size });
    for (const tab of this.tabs.values()) {
      tab.socket.send(payload);
    }
    for (const listener of this.listeners) {
      listener(this.tabs.size);
    }
  }

  pickTab(tabId) {
    if (tabId) {
      const tab = this.tabs.get(tabId);
      if (!tab) {
        throw new Error("That Sketchbench tab is no longer connected.");
      }
      return tab;
    }
    let best = null;
    for (const tab of this.tabs.values()) {
      if (!best || tab.lastActive > best.lastActive) {
        best = tab;
      }
    }
    if (!best) {
      throw new Error(
        "No Sketchbench tab is connected. Open the app (yarn start) and keep the tab open.",
      );
    }
    return best;
  }

  /** Invoke a canvas method in a tab and await its result. */
  call(method, params, tabId) {
    const tab = this.pickTab(tabId);
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Canvas did not answer ${method} within 30s.`));
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      tab.socket.send(JSON.stringify({ type: "call", id, method, params }));
    });
  }

  /** Broadcast a non-call event (e.g. assistant activity) to one tab. */
  notify(tabId, event) {
    const tab = tabId ? this.tabs.get(tabId) : null;
    tab?.socket.send(JSON.stringify({ type: "event", ...event }));
  }
}

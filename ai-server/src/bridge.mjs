// WebSocket bridge between this server and open Sketchbench tabs.
//
// The canvas only exists in the browser, so tool calls from MCP clients and the
// in-app assistant are relayed to a tab and its reply is awaited.
//
// Tabs identify themselves with two secrets generated in the browser:
//   tabId    - one per tab; the in-app assistant targets its own tab by it.
//   pairing  - one per browser (localStorage); MCP clients present it as a
//              bearer token and only ever reach tabs that share it.
// With REQUIRE_PAIRING (public deployments) a call without a matching pairing
// token is refused, so no visitor can reach another visitor's canvas.

import { randomUUID } from "node:crypto";

import { WebSocketServer } from "ws";

const CALL_TIMEOUT_MS = 30_000;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export const isValidSecret = (value) =>
  typeof value === "string" && SECRET_PATTERN.test(value);

export class CanvasBridge {
  constructor({ allowedOrigins, requirePairing, log }) {
    this.allowedOrigins = allowedOrigins;
    this.requirePairing = requirePairing;
    this.log = log;
    /** @type {Map<string, {socket: import("ws").WebSocket, pairing: string | null, lastActive: number}>} */
    this.tabs = new Map();
    /** @type {Map<string, {resolve: Function, reject: Function, timer: NodeJS.Timeout, socket: import("ws").WebSocket}>} */
    this.pending = new Map();
    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: 32 * 1024 * 1024,
    });
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
          if (!isValidSecret(msg.tabId)) {
            socket.close(1008, "invalid tab id");
            return;
          }
          const pairing = isValidSecret(msg.pairing) ? msg.pairing : null;
          if (this.requirePairing && !pairing) {
            socket.close(1008, "pairing token required");
            return;
          }
          // A tab id already held by another browser can't be taken over.
          const existing = this.tabs.get(msg.tabId);
          if (
            existing &&
            existing.socket !== socket &&
            existing.pairing !== pairing
          ) {
            socket.close(1008, "tab id in use");
            return;
          }
          tabId = msg.tabId;
          this.tabs.set(tabId, { socket, pairing, lastActive: Date.now() });
          this.log(`bridge: tab connected (${this.tabs.size} open)`);
          break;
        }
        case "focus": {
          const tab = tabId && this.tabs.get(tabId);
          if (tab && tab.socket === socket) {
            tab.lastActive = Date.now();
          }
          break;
        }
        case "result": {
          const pending = this.pending.get(msg.id);
          // Only the tab that was asked may answer.
          if (!pending || pending.socket !== socket) {
            return;
          }
          this.pending.delete(msg.id);
          clearTimeout(pending.timer);
          if (msg.error) {
            pending.reject(new Error(String(msg.error)));
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
        this.log(`bridge: tab disconnected (${this.tabs.size} open)`);
      }
      for (const [id, pending] of this.pending) {
        if (pending.socket === socket) {
          this.pending.delete(id);
          clearTimeout(pending.timer);
          pending.reject(new Error("The Sketchbench tab closed."));
        }
      }
    });
  }

  /**
   * Resolve the tab a call should go to.
   * @param {{tabId?: string, pairing?: string | null}} target
   */
  pickTab({ tabId, pairing } = {}) {
    if (this.requirePairing && !pairing) {
      throw new Error(
        "A pairing token is required. Copy the MCP command from the AI panel in Sketchbench.",
      );
    }
    if (tabId) {
      const tab = this.tabs.get(tabId);
      if (
        !tab ||
        (pairing && tab.pairing !== pairing) ||
        (this.requirePairing && tab.pairing !== pairing)
      ) {
        throw new Error("That Sketchbench tab is not connected.");
      }
      return tab;
    }
    let best = null;
    for (const tab of this.tabs.values()) {
      if (pairing && tab.pairing !== pairing) {
        continue;
      }
      if (!best || tab.lastActive > best.lastActive) {
        best = tab;
      }
    }
    if (!best) {
      throw new Error(
        "No Sketchbench tab is connected for this token. Open Sketchbench in your browser and keep the tab open.",
      );
    }
    return best;
  }

  /** Invoke a canvas method in a tab and await its result. */
  call(method, params, target) {
    const tab = this.pickTab(target);
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Canvas did not answer ${method} within 30s.`));
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer, socket: tab.socket });
      tab.socket.send(JSON.stringify({ type: "call", id, method, params }));
    });
  }
}

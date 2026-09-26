// Excalidraw AI server.
//
//   POST /v1/ai/text-to-diagram/chat-streaming    Mermaid from a description (TTD dialog)
//   POST /v1/ai/diagram-to-code/generate-streaming  HTML from a wireframe frame
//   POST /v1/ai/assistant/chat-streaming          Canvas assistant with drawing tools
//   POST /mcp                                     MCP (Streamable HTTP) canvas tools
//   POST /v1/canvas/tools/:name                   Tool relay used by the stdio MCP shim
//   GET  /health                                  Status
//   WS   /bridge                                  Browser tabs connect here
//
// Binds to localhost only. The canvas tools act on the user's open tab, so the
// server refuses cross-origin browser requests from anything but the app.

import http from "node:http";
import { fileURLToPath } from "node:url";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { CanvasBridge } from "./bridge.mjs";
import {
  ASSISTANT_SYSTEM,
  DIAGRAM_TO_CODE_SYSTEM,
  MODEL,
  TEXT_TO_DIAGRAM_SYSTEM,
  baseParams,
  client,
  describeError,
  statusForError,
} from "./claude.mjs";
import { createMcpServer } from "./mcp.mjs";
import {
  CANVAS_TOOLS,
  runCanvasTool,
  toClaudeContent,
  validateToolInput,
} from "./tools.mjs";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url)));
} catch {
  // no .env file; rely on the environment
}

const PORT = Number(process.env.PORT || 3016);
const HOST = process.env.AI_SERVER_HOST || "localhost";
const MAX_BODY_BYTES = 20 * 1024 * 1024;
const MAX_ASSISTANT_TURNS = 16;

const ALLOWED_ORIGINS = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

const log = (...args) =>
  console.log(new Date().toISOString().slice(11, 19), ...args);

const bridge = new CanvasBridge({ allowedOrigins: ALLOWED_ORIGINS, log });

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const isAllowedOrigin = (origin) => bridge.isAllowedOrigin(origin);

const setCors = (req, res) => {
  const { origin } = req.headers;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, X-Excalidraw-Bridge",
    );
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  }
};

const sendJSON = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readJSON = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(
          Object.assign(new Error("Request body too large"), { status: 413 }),
        );
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(
          chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {},
        );
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });

/** Server-sent events in the StreamChunk shape the Excalidraw client parses. */
const openSSE = (res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (chunk) => res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  return {
    send,
    content: (delta) => send({ type: "content", delta }),
    error: (message) => send({ type: "error", error: { message } }),
    end: (finishReason = "stop") => {
      send({ type: "done", finishReason });
      res.write("data: [DONE]\n\n");
      res.end();
    },
  };
};

/**
 * Drops Markdown fence lines (```mermaid, ```html, ```) from a text stream,
 * since the client feeds the raw text straight into a parser.
 */
const fenceStripper = (emit) => {
  let buffer = "";
  const flushLine = (line) => {
    if (!/^\s*```/.test(line)) {
      emit(line);
    }
  };
  return {
    push(delta) {
      buffer += delta;
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        flushLine(buffer.slice(0, newline + 1));
        buffer = buffer.slice(newline + 1);
      }
    },
    flush() {
      if (buffer) {
        flushLine(buffer);
        buffer = "";
      }
    },
  };
};

/** Stream a single-shot generation's text to the client as SSE. */
const streamText = async (req, res, params) => {
  const stream = client.beta.messages.stream(params);
  res.on("close", () => stream.abort());

  let sse = null;
  let stripper = null;
  try {
    for await (const event of stream) {
      if (!sse) {
        // Open the SSE response only once Claude accepted the request, so
        // auth/validation failures still reach the client as HTTP errors.
        sse = openSSE(res);
        stripper = fenceStripper((text) => sse.content(text));
      }
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        stripper.push(event.delta.text);
      }
    }
    const message = await stream.finalMessage();
    stripper?.flush();
    if (message.stop_reason === "refusal") {
      sse.error("Claude declined this request.");
    }
    sse.end(message.stop_reason === "max_tokens" ? "length" : "stop");
  } catch (error) {
    // `req` is always destroyed once its body is read; only `res` says whether
    // the client is still listening.
    if (res.writableEnded || res.destroyed) {
      return;
    }
    log("stream error:", describeError(error));
    if (sse) {
      sse.error(describeError(error));
      sse.end(null);
    } else {
      sendJSON(res, statusForError(error), {
        statusCode: statusForError(error),
        message: describeError(error),
      });
    }
  }
};

const toLLMMessages = (messages) =>
  (Array.isArray(messages) ? messages : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .map((m) => ({ role: m.role, content: m.content }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const textToDiagram = async (req, res) => {
  const { messages } = await readJSON(req);
  const history = toLLMMessages(messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return sendJSON(res, 400, {
      message: "Expected a conversation ending with a user message.",
    });
  }
  log(`ttd: ${history.length} message(s)`);
  await streamText(
    req,
    res,
    baseParams({
      system: TEXT_TO_DIAGRAM_SYSTEM,
      messages: history,
      output_config: { effort: "medium" },
    }),
  );
};

const diagramToCode = async (req, res) => {
  const { texts, image, theme } = await readJSON(req);
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(
    image || "",
  );
  if (!match) {
    return sendJSON(res, 400, { message: "Expected a base64 image data URL." });
  }
  log("d2c: generating prototype");
  await streamText(
    req,
    res,
    baseParams({
      system: DIAGRAM_TO_CODE_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: match[1], data: match[2] },
            },
            {
              type: "text",
              text: `Theme: ${
                theme === "dark" ? "dark" : "light"
              }.\n\nText found in the wireframe:\n${
                String(texts || "").trim() || "(none)"
              }\n\nBuild the HTML prototype.`,
            },
          ],
        },
      ],
    }),
  );
};

/** Short, UI-friendly description of a tool call for the activity log. */
const summarizeTool = (name, input) => {
  switch (name) {
    case "add_elements":
      return `Adding ${input.elements?.length ?? 0} element(s)`;
    case "update_elements":
      return `Updating ${input.updates?.length ?? 0} element(s)`;
    case "delete_elements":
      return `Deleting ${input.ids?.length ?? 0} element(s)`;
    case "add_mermaid":
      return "Drawing diagram from Mermaid";
    case "export_image":
      return "Looking at the canvas";
    case "get_scene":
      return "Reading the canvas";
    case "focus_view":
      return "Moving the view";
    case "clear_canvas":
      return "Clearing the canvas";
    default:
      return name;
  }
};

const assistantTools = CANVAS_TOOLS.map((tool) => ({
  ...tool,
  eager_input_streaming: true,
}));

const assistant = async (req, res) => {
  const { messages, tabId, selectedIds } = await readJSON(req);
  const history = toLLMMessages(messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return sendJSON(res, 400, {
      message: "Expected a conversation ending with a user message.",
    });
  }
  if (!tabId || !bridge.tabs.has(tabId)) {
    return sendJSON(res, 409, {
      message:
        "This tab is not connected to the AI server yet. Wait a second and retry.",
    });
  }

  // Selection is volatile, so it rides on the latest user turn, not the system prompt.
  const last = history[history.length - 1];
  if (Array.isArray(selectedIds) && selectedIds.length) {
    last.content += `\n\n(Currently selected element ids: ${selectedIds
      .slice(0, 200)
      .join(", ")})`;
  }

  const conversation = [...history];
  const sse = openSSE(res);
  let aborted = false;
  let current = null;
  res.on("close", () => {
    aborted = true;
    current?.abort();
  });

  log(`assistant: ${history.length} message(s), tab ${tabId}`);
  try {
    for (let turn = 0; turn < MAX_ASSISTANT_TURNS && !aborted; turn++) {
      current = client.beta.messages.stream(
        baseParams({
          system: [
            {
              type: "text",
              text: ASSISTANT_SYSTEM,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: assistantTools,
          messages: conversation,
        }),
      );

      for await (const event of current) {
        if (
          event.type === "content_block_start" &&
          event.content_block.type === "thinking"
        ) {
          sse.send({ type: "status", status: "thinking" });
        } else if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          sse.content(event.delta.text);
        }
      }
      const message = await current.finalMessage();

      if (message.stop_reason === "refusal") {
        sse.error("Claude declined this request.");
        break;
      }
      conversation.push({ role: "assistant", content: message.content });
      if (message.stop_reason !== "tool_use") {
        break;
      }

      // Canvas edits depend on order, so tool calls run sequentially.
      const results = [];
      for (const block of message.content) {
        if (block.type !== "tool_use") {
          continue;
        }
        const invalid = validateToolInput(block.name, block.input);
        const summary = summarizeTool(block.name, block.input ?? {});
        sse.send({
          type: "tool",
          id: block.id,
          name: block.name,
          summary,
          state: "running",
        });
        if (invalid) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: invalid,
            is_error: true,
          });
          sse.send({
            type: "tool",
            id: block.id,
            name: block.name,
            summary,
            state: "error",
          });
          continue;
        }
        try {
          const content = await runCanvasTool(
            block.name,
            block.input,
            (method, params) => bridge.call(method, params, tabId),
          );
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: toClaudeContent(content),
          });
          sse.send({
            type: "tool",
            id: block.id,
            name: block.name,
            summary,
            state: "done",
          });
        } catch (error) {
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: error?.message || String(error),
            is_error: true,
          });
          sse.send({
            type: "tool",
            id: block.id,
            name: block.name,
            summary,
            state: "error",
          });
        }
      }
      conversation.push({ role: "user", content: results });
    }
    if (!aborted) {
      sse.end();
    }
  } catch (error) {
    if (aborted) {
      return;
    }
    log("assistant error:", describeError(error));
    sse.error(describeError(error));
    sse.end(null);
  }
};

const runToolForRelay = (name, args) =>
  runCanvasTool(name, args, (method, params) => bridge.call(method, params));

const canvasToolRelay = async (req, res, name) => {
  // Custom header forces a CORS preflight, which foreign origins fail.
  if (req.headers["x-excalidraw-bridge"] !== "1") {
    return sendJSON(res, 403, { error: "Missing X-Excalidraw-Bridge header." });
  }
  const args = await readJSON(req);
  const invalid = validateToolInput(name, args);
  if (invalid) {
    return sendJSON(res, 400, { error: invalid });
  }
  try {
    sendJSON(res, 200, { content: await runToolForRelay(name, args) });
  } catch (error) {
    sendJSON(res, 502, { error: error?.message || String(error) });
  }
};

const mcpHttp = async (req, res) => {
  // Stateless Streamable HTTP: a fresh server + transport per request.
  const server = createMcpServer(runToolForRelay);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  const body = req.method === "POST" ? await readJSON(req) : undefined;
  await transport.handleRequest(req, res, body);
};

// ---------------------------------------------------------------------------

const isLocalHost = (host = "") =>
  /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
  process.env.ALLOW_ANY_HOST === "true";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  setCors(req, res);

  // DNS-rebinding and cross-site guard.
  if (
    !isLocalHost(req.headers.host) ||
    (req.headers.origin && !isAllowedOrigin(req.headers.origin))
  ) {
    return sendJSON(res, 403, { message: "Forbidden origin." });
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJSON(res, 200, {
        ok: true,
        model: MODEL,
        tabs: bridge.tabs.size,
        credentials: Boolean(
          process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
        ),
      });
    }
    if (url.pathname === "/mcp") {
      return await mcpHttp(req, res);
    }
    if (req.method === "POST") {
      switch (url.pathname) {
        case "/v1/ai/text-to-diagram/chat-streaming":
          return await textToDiagram(req, res);
        case "/v1/ai/diagram-to-code/generate-streaming":
          return await diagramToCode(req, res);
        case "/v1/ai/assistant/chat-streaming":
          return await assistant(req, res);
      }
      const relay = /^\/v1\/canvas\/tools\/([a-z_]+)$/.exec(url.pathname);
      if (relay) {
        return await canvasToolRelay(req, res, relay[1]);
      }
    }
    sendJSON(res, 404, { message: "Not found" });
  } catch (error) {
    log("request error:", error?.message);
    if (!res.headersSent) {
      sendJSON(res, error.status || 500, {
        message: error?.message || "Server error",
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

bridge.attach(server, "/bridge");

server.listen(PORT, HOST, () => {
  log(`Excalidraw AI server on http://${HOST}:${PORT} (model ${MODEL})`);
  log(`MCP endpoint: http://${HOST}:${PORT}/mcp`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    log(
      "warning: no ANTHROPIC_API_KEY set; AI routes will fail until one is provided",
    );
  }
});

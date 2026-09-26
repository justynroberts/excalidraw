#!/usr/bin/env node
// stdio MCP entry point for clients that launch servers as subprocesses
// (Claude Desktop, older MCP clients). It holds no canvas state itself: each
// tool call is forwarded to the running ai-server, which relays it to the tab.
//
//   { "command": "node", "args": ["/abs/path/ai-server/src/mcp-stdio.mjs"] }

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMcpServer } from "./mcp.mjs";

const BASE_URL =
  process.env.EXCALIDRAW_AI_URL ||
  `http://localhost:${process.env.PORT || 3016}`;

const runTool = async (name, args) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}/v1/canvas/tools/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Excalidraw-Bridge": "1",
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error(
      `Excalidraw AI server is not running at ${BASE_URL}. Start it with "yarn start:ai".`,
    );
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Canvas call failed (${response.status}).`);
  }
  return body.content;
};

await createMcpServer(runTool).connect(new StdioServerTransport());

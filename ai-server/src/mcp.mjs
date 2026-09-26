// MCP server exposing the canvas tools. Built per transport: the HTTP endpoint
// calls the bridge directly, the stdio shim forwards over HTTP to a running server.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { CANVAS_TOOLS, validateToolInput } from "./tools.mjs";

const INSTRUCTIONS = `Tools for drawing on a live Excalidraw whiteboard open in the user's browser. Changes appear instantly and are undoable there.

Start with get_scene to see what exists. Use add_mermaid for structured diagrams (flowcharts, sequences, ER, class, state); it is faster and neater than placing shapes by hand. Use add_elements for freeform layouts, sticky notes and annotations: give new shapes ids so arrows can bind to them via start/end. Use export_image to look at the result, and focus_view to bring your work into the user's view.`;

/**
 * @param {(name: string, args: object) => Promise<Array<object>>} runTool
 *   Executes a canvas tool and returns MCP content blocks.
 */
export const createMcpServer = (runTool) => {
  const server = new Server(
    { name: "excalidraw-canvas", version: "0.1.0" },
    { capabilities: { tools: {} }, instructions: INSTRUCTIONS },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: CANVAS_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const invalid = validateToolInput(name, args);
    if (invalid) {
      return { content: [{ type: "text", text: invalid }], isError: true };
    }
    try {
      return { content: await runTool(name, args) };
    } catch (error) {
      return {
        content: [{ type: "text", text: error?.message || String(error) }],
        isError: true,
      };
    }
  });

  return server;
};

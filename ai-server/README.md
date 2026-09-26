# Sketchbench AI server

Claude-powered backend for Sketchbench (a fork of Excalidraw). It does three jobs:

1. **Powers Excalidraw's built-in AI features.** Text-to-diagram (the "Generate" dialog) and wireframe-to-code (Magic Frame) are part of upstream Excalidraw, but their backend is Excalidraw's own hosted service and isn't open source. This server implements the same endpoints with Claude.
2. **Runs the canvas assistant** in the app's Claude sidebar panel. Claude can read, draw, edit, tidy and critique the live canvas through tools.
3. **Exposes the canvas over MCP**, so Claude Code, Claude Desktop or any MCP client can draw on the tab you have open.

## Setup

```bash
# from the repo root
yarn install:ai
cp ai-server/.env.example ai-server/.env    # then set ANTHROPIC_API_KEY
yarn start:ai                                # http://localhost:3016
yarn start                                   # the app, http://localhost:3001
```

Open the app and click **Claude** (top right). A cyan "live" marker means the tab is connected.

| Variable | Default |  |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | none | Any SDK credential works (`ANTHROPIC_AUTH_TOKEN`, an `ant auth login` profile) |
| `ANTHROPIC_MODEL` | `claude-opus-5` |  |
| `PORT` | `3016` | Change `VITE_APP_AI_BACKEND` in `.env.development` to match |
| `AI_SERVER_HOST` | `localhost` |  |
| `ALLOWED_ORIGINS` | none | Comma-separated extra origins, for a deployed app |

Requests use server-side refusal fallback (`fallbacks: "default"`). If the primary model declines, the API retries on Anthropic's recommended fallback model.

## MCP

MCP tools act on the Sketchbench tab you focused most recently, so keep the app open.

**Claude Code** (Streamable HTTP):

```bash
claude mcp add --transport http sketchbench http://localhost:3016/mcp
```

**Claude Desktop** (stdio shim; the AI server must be running). Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sketchbench": {
      "command": "node",
      "args": ["/absolute/path/to/sketchbench/ai-server/src/mcp-stdio.mjs"]
    }
  }
}
```

| Tool | What it does |
| --- | --- |
| `get_scene` | Elements, labels, bindings, selection and content bounds |
| `add_elements` | Shapes, text, sticky notes, arrows (bound by id), lines, frames |
| `update_elements` | Move, resize, recolour, relabel; bound arrows re-route |
| `delete_elements` | Delete by id |
| `add_mermaid` | Mermaid source to native, editable elements |
| `export_image` | PNG of the canvas (or some elements), so Claude can see it |
| `focus_view` | Scroll and zoom the user's view |
| `clear_canvas` | Delete everything (undoable) |

Every change lands as one undo step in the browser.

## Endpoints

|  |  |
| --- | --- |
| `POST /v1/ai/text-to-diagram/chat-streaming` | `{messages}` returns SSE Mermaid |
| `POST /v1/ai/diagram-to-code/generate-streaming` | `{texts, image, theme}` returns SSE HTML |
| `POST /v1/ai/assistant/chat-streaming` | `{messages, tabId, selectedIds}` returns SSE text, tool and status events |
| `POST /mcp` | MCP, Streamable HTTP, stateless |
| `POST /v1/canvas/tools/:name` | Tool relay used by the stdio shim (requires `X-Excalidraw-Bridge: 1`) |
| `GET /health` | Status, model and connected tab count |
| `WS /bridge` | Browser tabs connect here |

The server listens on localhost only. It refuses cross-origin requests from anything but the app, and it refuses non-local `Host` headers.

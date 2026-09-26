# CLAUDE.md

## Project Structure

Excalidraw is a **monorepo** with a clear separation between the core library and the application:

- **`packages/excalidraw/`** - Main React component library published to npm as `@excalidraw/excalidraw`
- **`excalidraw-app/`** - Full-featured web application (excalidraw.com) that uses the library
- **`packages/`** - Core packages: `@excalidraw/common`, `@excalidraw/element`, `@excalidraw/math`, `@excalidraw/utils`
- **`examples/`** - Integration examples (NextJS, browser script)

## Development Workflow

1. **Package Development**: Work in `packages/*` for editor features
2. **App Development**: Work in `excalidraw-app/` for app-specific features
3. **Testing**: Always run `yarn test:update` before committing
4. **Type Safety**: Use `yarn test:typecheck` to verify TypeScript

## Development Commands

```bash
yarn test:typecheck  # TypeScript type checking
yarn test:update     # Run all tests (with snapshot updates)
yarn fix             # Auto-fix formatting and linting issues
```

## Architecture Notes

### Package System

- Uses Yarn workspaces for monorepo management
- Internal packages use path aliases (see `vitest.config.mts`)
- Build system uses esbuild for packages, Vite for the app
- TypeScript throughout with strict configuration

- Guidelines in `AGENTS.md` apply too (e.g. `app.ownerDocument` / `app.ownerWindow` over DOM globals in `packages/*`).
- Run a single test file: `yarn test:app --watch=false packages/excalidraw/tests/<file>.test.tsx`

## This fork: Claude AI layer

This is a fork of [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw) (MIT). The fork adds a Claude-powered AI backend, an in-app canvas assistant, an MCP bridge and a restyled chrome. Keep fork changes out of `packages/*` where possible so upstream merges stay clean (`git fetch upstream && git merge upstream/master`).

### Running

```bash
yarn install && yarn install:ai   # app deps (yarn) + ai-server deps (npm, own lockfile)
cp ai-server/.env.example ai-server/.env   # set ANTHROPIC_API_KEY
yarn start:ai                     # AI server + MCP on :3016
yarn start                        # app on :3001 (VITE_APP_AI_BACKEND points at :3016)
```

### How the pieces connect

- `ai-server/` is a standalone Node ESM service (not a yarn workspace, no build step, own `package-lock.json`). `src/server.mjs` routes; `src/claude.mjs` holds the Anthropic client, model (`ANTHROPIC_MODEL`, default `claude-opus-5`) and all system prompts.
- The canvas only exists in the browser. Every canvas tool (MCP or assistant) goes server -> WebSocket `/bridge` -> the most recently focused tab -> `excalidraw-app/ai/canvasOps.ts` -> reply. `src/bridge.mjs` is the server end, `excalidraw-app/ai/bridgeClient.ts` the browser end.
- Tools are defined once in `ai-server/src/tools.mjs` (JSON Schema) and served both as MCP tools (`src/mcp.mjs`, HTTP at `/mcp`, stdio via `src/mcp-stdio.mjs`) and as Claude API tools for the assistant loop in `server.mjs`. Adding a tool = schema + `METHODS` entry in `tools.mjs` + handler in `CANVAS_METHODS` (`canvasOps.ts`).
- Upstream's text-to-diagram and diagram-to-code UIs call `/v1/ai/text-to-diagram/chat-streaming` and `/v1/ai/diagram-to-code/generate-streaming`; the SSE chunk shape (`{type: "content" | "error" | "done"}`) is dictated by `packages/excalidraw/components/TTDDialog/utils/TTDStreamFetch.ts`. TTD expects raw Mermaid back.
- UI: `excalidraw-app/ai/ClaudePanel.tsx` (sidebar tab `claude`), `excalidraw-app/theme/blueprint.scss` (token overrides on Excalidraw's theme). Design rules in `DESIGN.md`.

### Gotchas

- After editing `excalidraw-app/ai/*`, **reload the tab**: HMR swaps modules but the running bridge keeps its closure over the old `canvasOps`.
- `convertToExcalidrawElements` derives an arrow binding's `fixedPoint` from the skeleton's own endpoints and only binds to shapes in the same batch. `canvasOps.ts` pre-routes arrows edge-to-edge (`routeBoundArrows`) and binds to existing shapes itself (`bindToExistingShapes`). Moving/resizing uses a scratch `Scene` + `updateBindings`, as the Stats panel does.
- Deleted elements keep their ids; `addElements` lets new elements reuse them (bumping `version` so collab reconciliation keeps the new one).
- Charts drawn by the assistant: max three series (validated palette slots), legend + direct end labels whenever there are two or more series, text in ink colours, status colours only with a word/arrow. Enforced by the system prompt in `ai-server/src/claude.mjs`.
- The server binds `localhost` (not `127.0.0.1`) and reads `AI_SERVER_HOST`, not `HOST` (zsh exports `HOST` as the machine name). It rejects foreign `Origin`s and non-local `Host` headers; `/v1/canvas/tools/*` also requires the `X-Excalidraw-Bridge: 1` header.

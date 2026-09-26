# Notice

This repository is a fork of **[Excalidraw](https://github.com/excalidraw/excalidraw)**, copyright (c) 2020 Excalidraw, released under the MIT License. The original license text is preserved unchanged in [`LICENSE`](LICENSE), and it continues to cover all upstream code.

## Changes in this fork

Additions and modifications by Justyn Roberts ([FintonLabs](https://fintonlabs.com)), also released under the MIT License:

- `ai-server/`: the Claude-powered AI backend and MCP canvas bridge
- `excalidraw-app/ai/`: the Claude sidebar panel, the canvas bridge client, canvas operations and dashboard templates
- `excalidraw-app/theme/`: the Blueprint theme layer
- `templates/dashboards/`: ten dashboard templates as `.excalidraw` files
- Small integration edits to `excalidraw-app/App.tsx`, `excalidraw-app/components/AppSidebar.tsx`, `excalidraw-app/useHandleAppTheme.ts` and `package.json`

"Excalidraw" is the name of the upstream project. This fork is not affiliated with or endorsed by the Excalidraw team. Upstream history is kept intact in git.

Claude is a product of Anthropic. The AI features call the Anthropic API with your own API key.

# Notice

This repository (Excalidraw-FL) is a fork of **[Excalidraw](https://github.com/excalidraw/excalidraw)**, copyright (c) 2020 Excalidraw, released under the MIT License. The original license text is preserved unchanged in [`LICENSE`](LICENSE), and it continues to cover all upstream code.

## Changes in this fork

Additions and modifications by Justyn Roberts ([FintonLabs](https://fintonlabs.com)), also released under the MIT License:

- `ai-server/`: the Claude-powered AI backend and MCP canvas bridge
- `excalidraw-app/ai/`: the Claude sidebar panel, the canvas bridge client and canvas operations
- `excalidraw-app/theme/`: the Blueprint theme layer
- `excalidraw-app/components/ForkNotice.*`: the "About Excalidraw-FL" notice, which credits upstream and links to Excalidraw+
- Seven extra canvas fonts (handwritten and architect), registered in `packages/common` and `packages/excalidraw/fonts`
- Integration edits to `excalidraw-app/App.tsx`, `excalidraw-app/components/AppMainMenu.tsx` (About Excalidraw-FL and FintonLabs links), `excalidraw-app/components/AppSidebar.tsx` (AI tab added; the Excalidraw+ trial promo tabs removed), `excalidraw-app/useHandleAppTheme.ts` (dark by default) and `package.json`

## Third-party fonts added by this fork

All are licensed under the SIL Open Font License 1.1. They are bundled unmodified, with each font's copyright and license text beside it:

- `packages/excalidraw/fonts/`: Architects Daughter, Gloria Hallelujah and Shadows Into Light (© Kimberly Geswein); Caveat (© The Caveat Project Authors); Kalam (© Indian Type Foundry); Patrick Hand (© Patrick Wagesreiter); Gochi Hand (© Huerta Tipográfica / HT Fonts, Reserved Font Names "Gochi" and "Gochi Hand")
- `excalidraw-app/theme/fonts/`: IBM Plex Sans and IBM Plex Mono (© IBM Corp.)

"Excalidraw" is the name of the upstream project. This fork is not affiliated with or endorsed by the Excalidraw team. Upstream history is kept intact in git.

Claude is a product of Anthropic. The AI features call the Anthropic API with your own API key.

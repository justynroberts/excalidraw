# Notice

This repository (**Sketchbench**) is a fork of **[Excalidraw](https://github.com/excalidraw/excalidraw)**, copyright (c) 2020 Excalidraw, released under the MIT License. The original license text is preserved unchanged in [`LICENSE`](LICENSE), and it continues to cover all upstream code.

## Changes in this fork

Additions and modifications by Justyn Roberts ([FintonLabs](https://fintonlabs.com)), also released under the MIT License:

- `ai-server/`: the Claude-powered AI backend, the MCP canvas bridge, and self-hosted storage for share links, collaboration rooms and image files (replacing Excalidraw's hosted json.excalidraw.com and Firebase)
- `excalidraw-app/data/firebase.ts`: a storage-backend mode that routes Firebase operations to that server
- `.env.production` / `.env.development`: point every backend at Sketchbench's own services instead of Excalidraw's
- `excalidraw-app/ai/`: the Claude sidebar panel, the canvas bridge client and canvas operations
- `excalidraw-app/theme/`: the Blueprint theme layer
- `excalidraw-app/components/ForkNotice.*`: the "About Sketchbench" notice, which credits upstream and links to Excalidraw+
- `excalidraw-app/components/SketchbenchLogo.*`, `public/` icons: Sketchbench branding (the welcome screen, favicons and PWA icons). Page title and metadata in `excalidraw-app/index.html`, and the PWA manifest in `excalidraw-app/vite.config.mts`
- `excalidraw-app/data/welcomeScene.ts`: the first-run welcome sheet
- `excalidraw-app/data/exportPdf.ts`: PDF export
- `excalidraw-app/ai/LibraryTemplates.tsx`: an in-app browser for the community libraries at libraries.excalidraw.com, which fetches them from that site and credits each author
- Eight extra canvas fonts (handwritten, architect and draughtsman), registered in `packages/common` and `packages/excalidraw/fonts`
- Integration edits to `excalidraw-app/App.tsx`, `excalidraw-app/components/AppMainMenu.tsx` (About Sketchbench, Export as PDF and FintonLabs items), `excalidraw-app/components/AppSidebar.tsx` (AI tab added; the Excalidraw+ trial promo tabs removed), `excalidraw-app/useHandleAppTheme.ts` (dark by default) and `package.json`

## Third-party fonts added by this fork

All are licensed under the SIL Open Font License 1.1. They are bundled unmodified, with each font's copyright and license text beside it:

- `packages/excalidraw/fonts/`: Architects Daughter, Gloria Hallelujah and Shadows Into Light (© Kimberly Geswein); Caveat (© The Caveat Project Authors); Kalam (© Indian Type Foundry); Patrick Hand (© Patrick Wagesreiter); Gochi Hand (© Huerta Tipográfica / HT Fonts, Reserved Font Names "Gochi" and "Gochi Hand")
- `excalidraw-app/theme/fonts/`: IBM Plex Sans and IBM Plex Mono (© IBM Corp.)

osifont (`packages/excalidraw/fonts/Osifont/`, © Zefram Cochrane and contributors) is licensed under the GNU LGPL v3 with the GPL font exception. It ships unmodified (repackaged losslessly from TTF to WOFF2), with its full license in `LICENSE.txt`. The font exception means documents that embed it, such as exported SVG and PDF files, are not themselves covered by the GPL.

"Excalidraw" is the name of the upstream project. It is used here only to credit the source. Sketchbench is not affiliated with or endorsed by the Excalidraw team. The upstream Excalidraw+ auto-redirect has been removed from `index.html`, so this fork never sends users to excalidraw.com. Upstream history is kept intact in git.

Claude is a product of Anthropic. The AI features call the Anthropic API with your own API key.

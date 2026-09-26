# Design

|  |  |
| --- | --- |
| **Direction** | Blueprint: the editor chrome as a drafting table |
| **Ground** | Near-black `#0b0c0f` / islands `#101216`, dark theme is the default |
| **Typeface** | IBM Plex, one family: Plex Sans (400/500/600) for all chrome, Plex Mono for code, keyboard hints and the assistant's log markers. Self-hosted. Canvas content keeps Excalidraw's fonts plus seven added handwritten and architect faces |
| **Accent** | Single cyan: `#3fc8e4` on dark, `#0b8fb0` on light. Used for selection, focus, primary buttons and the live marker |
| **Surfaces** | No shadows anywhere. Islands, menus, dialogs and the sidebar are separated by 1px hairlines (`#20252c`). Radius 2px on controls, 4px maximum |
| **Motion** | State changes only, 120-150ms ease-out. `prefers-reduced-motion` honoured |
| **Recognisable idea** | Hairline islands floating on near-black with cyan as the only ink, like a lit drafting table; the AI panel reads as a terminal log (`>` prompts, `ok`/`err` tool rows) |

Recent siblings used per-category palettes (`3d-servicemap`, `ableton-ai`) and a manuscript direction (`2adventure`). This project uses a single cool accent on a monochrome ground, which none of them do.

## Constraints and where they were relaxed

- Implemented as **token overrides** on Excalidraw's own theme (`excalidraw-app/theme/blueprint.scss`), not a rewrite. That keeps upstream merges clean.
- Excalidraw's light theme and theme toggle are **kept**, although the house rule is near-black only. The toggle is upstream functionality, and a light canvas matters for printing and screenshots. The Blueprint geometry, type and accent also apply in light mode.
- The Claude panel uses Excalidraw's theme variables so that it follows the toggle.

## Charts drawn by the assistant

- Categorical slots come in a fixed order from the validated dataviz reference palette: `#2a78d6`, `#eb6834`, `#1baf7a`. At most three series per chart, so every pair clears the colour-vision floors in all-pairs mode.
- A legend and direct end labels appear whenever there are two or more series. A single series is named by its title.
- Text uses ink tokens and never a series colour. Status colours (`#0ca30c`, `#fab219`, `#ec835a`, `#d03b3b`) appear only on KPI deltas and service status, and always come with ▲/▼ or a status word.

## House identity

- "Made by FintonLabs" sits behind the `i` button in the Claude panel header (a `<dialog>` that closes on Escape, on backdrop click, or with its Close button).
- MIT header comment on every added stylesheet.

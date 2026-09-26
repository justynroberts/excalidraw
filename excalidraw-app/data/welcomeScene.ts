// First-run welcome sheet: a pencil-drawn architecture sketch of how
// Sketchbench fits together, laid out like a draughtsman's drawing sheet
// (border, lettering, title block). It is an ordinary drawing: select all and
// delete it, and it never comes back.

import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { FONT_FAMILY } from "@excalidraw/common";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const SHOWN_KEY = "sketchbench-welcome-shown-v1";

// Graphite pencil, with one coloured pencil for the AI server.
const GRAPHITE = "#343a40";
const LIGHT_GRAPHITE = "#868e96";
const BLUE_PENCIL = "#1971c2";
// Hatching sits under a label, so it uses a lighter pencil than the outline.
const BLUE_SHADE = "#a5d8ff";

const LETTERING = FONT_FAMILY.Osifont;
const HAND = FONT_FAMILY["Architects Daughter"];

const pencil = {
  strokeColor: GRAPHITE,
  strokeWidth: 1,
  roughness: 1,
};

const text = (
  x: number,
  y: number,
  value: string,
  fontSize: number,
  fontFamily: number,
  strokeColor = GRAPHITE,
) => ({
  type: "text" as const,
  x,
  y,
  text: value,
  fontSize,
  fontFamily,
  strokeColor,
});

const box = (
  id: string,
  type: "rectangle" | "ellipse",
  x: number,
  y: number,
  label: string,
  shade?: string,
) => ({
  ...pencil,
  id,
  type,
  x,
  y,
  width: 260,
  height: 120,
  ...(shade
    ? {
        strokeColor: shade,
        backgroundColor: BLUE_SHADE,
        fillStyle: "hachure" as const,
      }
    : {}),
  label: { text: label, fontSize: 20, fontFamily: LETTERING },
});

const arrow = (
  start: string,
  end: string,
  x: number,
  y: number,
  points: [number, number][],
  label?: string,
  both = false,
) => ({
  ...pencil,
  type: "arrow" as const,
  x,
  y,
  points,
  start: { id: start },
  end: { id: end },
  startArrowhead: both ? ("arrow" as const) : null,
  endArrowhead: "arrow" as const,
  ...(label ? { label: { text: label, fontSize: 16, fontFamily: HAND } } : {}),
});

const titleBlockRow = (y: number, key: string, value: string) => [
  text(976, y, key, 12, LETTERING, LIGHT_GRAPHITE),
  text(1100, y - 2, value, 16, LETTERING),
];

const buildSheet = () => [
  // Sheet border and margin line.
  {
    ...pencil,
    type: "rectangle" as const,
    x: 0,
    y: 0,
    width: 1400,
    height: 880,
    strokeWidth: 2,
  },
  {
    ...pencil,
    type: "rectangle" as const,
    x: 16,
    y: 16,
    width: 1368,
    height: 848,
    strokeColor: LIGHT_GRAPHITE,
  },

  // Lettering.
  text(64, 48, "SKETCHBENCH", 56, LETTERING),
  text(
    66,
    124,
    "A drafting table for ideas: sketch by hand, draw with AI, connect over MCP.",
    22,
    HAND,
  ),

  // The architecture.
  box("sb-you", "rectangle", 80, 250, "YOU\nbrowser canvas"),
  box(
    "sb-server",
    "rectangle",
    570,
    250,
    "AI SERVER\nlocalhost:3016",
    BLUE_PENCIL,
  ),
  box("sb-claude", "ellipse", 1060, 250, "CLAUDE API"),
  box("sb-mcp", "rectangle", 570, 520, "CLAUDE CODE /\nCLAUDE DESKTOP"),
  arrow(
    "sb-you",
    "sb-server",
    344,
    310,
    [
      [0, 0],
      [222, 0],
    ],
    "tool calls",
    true,
  ),
  arrow(
    "sb-server",
    "sb-claude",
    834,
    310,
    [
      [0, 0],
      [222, 0],
    ],
    "prompts",
    true,
  ),
  arrow(
    "sb-mcp",
    "sb-server",
    700,
    516,
    [
      [0, 0],
      [0, -142],
    ],
    "MCP",
  ),

  // Getting started, in the architect's hand.
  text(80, 470, "Start here", 26, HAND),
  text(80, 516, "1. Click AI (top right) and describe a diagram.", 18, HAND),
  text(80, 552, "2. Templates: add any Excalidraw library.", 18, HAND),
  text(80, 588, "3. Export: PNG, SVG or PDF from the menu.", 18, HAND),
  text(80, 624, "4. Try the fonts: Osifont is this lettering.", 18, HAND),
  text(
    80,
    676,
    "This sheet is just a drawing. Select all and delete it.",
    16,
    HAND,
    LIGHT_GRAPHITE,
  ),

  // Title block, bottom right.
  {
    ...pencil,
    type: "rectangle" as const,
    x: 960,
    y: 700,
    width: 408,
    height: 148,
  },
  {
    ...pencil,
    type: "line" as const,
    x: 960,
    y: 737,
    points: [
      [0, 0],
      [408, 0],
    ],
  },
  {
    ...pencil,
    type: "line" as const,
    x: 960,
    y: 774,
    points: [
      [0, 0],
      [408, 0],
    ],
  },
  {
    ...pencil,
    type: "line" as const,
    x: 960,
    y: 811,
    points: [
      [0, 0],
      [408, 0],
    ],
  },
  {
    ...pencil,
    type: "line" as const,
    x: 1088,
    y: 700,
    points: [
      [0, 0],
      [0, 148],
    ],
  },
  ...titleBlockRow(712, "PROJECT", "SKETCHBENCH"),
  ...titleBlockRow(749, "DRAWN BY", "FINTONLABS"),
  ...titleBlockRow(786, "BASED ON", "EXCALIDRAW (MIT)"),
  ...titleBlockRow(823, "SHEET", "1 OF 1     SCALE 1:1"),
];

const hasShown = () => {
  try {
    return localStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return true; // no storage: don't risk showing it on every load
  }
};

const markShown = () => {
  try {
    localStorage.setItem(SHOWN_KEY, "1");
  } catch {
    // ignore
  }
};

const waitForEditor = async (api: ExcalidrawImperativeAPI) => {
  for (let i = 0; i < 40 && api.getAppState().isLoading; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

/** Draw the welcome sheet on a first visit with an empty canvas. */
export const maybeShowWelcomeScene = async (
  api: ExcalidrawImperativeAPI,
  hasInitialScene: boolean,
) => {
  if (hasInitialScene || hasShown()) {
    return;
  }
  await waitForEditor(api);
  if (api.getSceneElements().length) {
    markShown();
    return;
  }

  // Text is measured on conversion, so the lettering fonts must be loaded.
  await Promise.all(
    ["Osifont", "Architects Daughter"].map((family) =>
      document.fonts.load(`20px "${family}"`).catch(() => undefined),
    ),
  );

  const elements = convertToExcalidrawElements(
    buildSheet() as ExcalidrawElementSkeleton[],
    { regenerateIds: false },
  );
  api.updateScene({
    elements,
    captureUpdate: CaptureUpdateAction.NEVER,
  });
  api.setViewport({
    target: elements,
    fit: "scale-down",
    animation: false,
    offsets: { ui: true },
  });
  markShown();
};

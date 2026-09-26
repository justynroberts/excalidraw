// First-run drawing: Sketchbench's own system architecture, pencil-drawn and
// laid out like a draughtsman's sheet (zones, lettering, notes, title block).
// It is an ordinary drawing: select all and delete it, and it never comes back.

import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { FONT_FAMILY } from "@excalidraw/common";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { routeBoundArrows } from "../ai/canvasOps";

const SHOWN_KEY = "sketchbench-welcome-shown-v1";

// Graphite pencil, with a blue coloured pencil for the Claude path.
const GRAPHITE = "#343a40";
const MUTED = "#868e96";
const BLUE_PENCIL = "#1971c2";
// Hatching sits under labels, so it uses a lighter pencil than outlines.
const BLUE_SHADE = "#a5d8ff";

const LETTERING = FONT_FAMILY.Osifont;
const HAND = FONT_FAMILY["Architects Daughter"];

type Skeleton = Record<string, any>;

const pencil = { strokeColor: GRAPHITE, strokeWidth: 1, roughness: 1 };

const text = (
  x: number,
  y: number,
  value: string,
  fontSize: number,
  fontFamily: number = LETTERING,
  strokeColor = GRAPHITE,
): Skeleton => ({
  type: "text",
  x,
  y,
  text: value,
  fontSize,
  fontFamily,
  strokeColor,
});

const zone = (x: number, y: number, w: number, h: number, title: string) => [
  {
    ...pencil,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeStyle: "dashed",
    strokeColor: MUTED,
  },
  text(x + 16, y + 12, title, 14, LETTERING, MUTED),
];

const box = (
  id: string,
  x: number,
  y: number,
  label: string,
  opts: { w?: number; h?: number; ellipse?: boolean; blue?: boolean } = {},
): Skeleton => ({
  ...pencil,
  id,
  type: opts.ellipse ? "ellipse" : "rectangle",
  x,
  y,
  width: opts.w ?? 240,
  height: opts.h ?? 72,
  ...(opts.blue
    ? {
        strokeColor: BLUE_PENCIL,
        backgroundColor: BLUE_SHADE,
        fillStyle: "hachure",
      }
    : {}),
  label: { text: label, fontSize: 16, fontFamily: LETTERING },
});

const arrow = (
  start: string,
  end: string,
  label?: string,
  both = false,
): Skeleton => ({
  ...pencil,
  type: "arrow",
  x: 0,
  y: 0,
  start: { id: start },
  end: { id: end },
  startArrowhead: both ? "arrow" : null,
  endArrowhead: "arrow",
  ...(label ? { label: { text: label, fontSize: 14, fontFamily: HAND } } : {}),
});

const buildSheet = (): Skeleton[] => {
  const els: Skeleton[] = [
    text(0, 0, "SKETCHBENCH  ·  SYSTEM ARCHITECTURE", 36),
    text(
      2,
      50,
      "How a request travels: browser app, local AI server, external services.",
      18,
      HAND,
    ),

    ...zone(0, 100, 600, 560, "BROWSER  ·  SKETCHBENCH APP"),
    ...zone(680, 100, 560, 400, "LOCAL  ·  AI SERVER :3016"),
    ...zone(1320, 100, 400, 560, "EXTERNAL"),

    // Browser app
    box("sb-editor", 40, 160, "EXCALIDRAW EDITOR\ncanvas · tools · fonts"),
    box("sb-panel", 320, 160, "AI PANEL\nchat · actions · templates"),
    box("sb-ops", 40, 320, "CANVAS OPS\nadd · update · bind"),
    box("sb-bridge", 320, 320, "BRIDGE CLIENT\nWebSocket"),
    box("sb-export", 40, 480, "EXPORT\nPNG · SVG · PDF"),

    // AI server
    box("sb-routes", 720, 160, "HTTP ROUTES\n/v1/ai/*  (SSE)", { w: 210 }),
    box("sb-loop", 1000, 160, "ASSISTANT LOOP\ntool use", {
      w: 200,
      blue: true,
    }),
    box("sb-ws", 720, 320, "WS BRIDGE\n/bridge", { w: 210 }),
    box("sb-mcp", 1000, 320, "MCP SERVER\n/mcp · stdio", { w: 200 }),

    // External
    box("sb-claude", 1370, 150, "CLAUDE API\nclaude-opus-5", {
      w: 300,
      h: 92,
      ellipse: true,
      blue: true,
    }),
    box("sb-clients", 1370, 320, "CLAUDE CODE /\nCLAUDE DESKTOP", { w: 300 }),
    box("sb-libs", 1370, 480, "LIBRARIES\nlibraries.excalidraw.com", {
      w: 300,
    }),

    // Runtime calls
    arrow("sb-panel", "sb-routes", "chat · SSE"),
    arrow("sb-routes", "sb-loop"),
    arrow("sb-loop", "sb-claude", "messages + tools"),
    arrow("sb-loop", "sb-ws", "tool calls"),
    arrow("sb-mcp", "sb-ws"),
    arrow("sb-clients", "sb-mcp", "MCP"),
    arrow("sb-ws", "sb-bridge", "WebSocket", true),
    arrow("sb-bridge", "sb-ops"),
    arrow("sb-ops", "sb-editor", "updateScene"),
    // Editor -> export, down the zone's left margin, clear of Canvas Ops.
    {
      ...pencil,
      type: "arrow",
      x: 40,
      y: 196,
      points: [
        [0, 0],
        [-20, 0],
        [-20, 320],
        [0, 320],
      ],
      start: { id: "sb-editor" },
      end: { id: "sb-export" },
      endArrowhead: "arrow",
    },
    // Templates: routed below the zones so it crosses nothing.
    {
      ...pencil,
      type: "arrow",
      x: 560,
      y: 196,
      points: [
        [0, 0],
        [20, 0],
        [20, 524],
        [960, 524],
        [960, 364],
      ],
      start: { id: "sb-panel" },
      end: { id: "sb-libs" },
      endArrowhead: "arrow",
      label: { text: "fetch .excalidrawlib", fontSize: 14, fontFamily: HAND },
    },

    // Notes
    text(0, 740, "Notes", 22, HAND),
    text(
      0,
      776,
      "1. The canvas lives only in the browser: every tool call, from the AI panel or",
      16,
      HAND,
    ),
    text(
      0,
      800,
      "   an MCP client, goes server → WebSocket → the most recently focused tab.",
      16,
      HAND,
    ),
    text(
      0,
      832,
      "2. Tools are defined once (ai-server/src/tools.mjs) and served to both paths.",
      16,
      HAND,
    ),
    text(0, 864, "3. Every canvas change is a single undo step.", 16, HAND),
    text(
      0,
      896,
      "Blue pencil = the Claude path.  Dashed = deployment boundary.  This sheet is just a drawing: select all and delete to start fresh.",
      14,
      HAND,
      MUTED,
    ),

    // Title block
    {
      ...pencil,
      type: "rectangle",
      x: 1320,
      y: 740,
      width: 400,
      height: 148,
    },
    ...[37, 74, 111].map((dy) => ({
      ...pencil,
      type: "line",
      x: 1320,
      y: 740 + dy,
      points: [
        [0, 0],
        [400, 0],
      ],
    })),
    {
      ...pencil,
      type: "line",
      x: 1448,
      y: 740,
      points: [
        [0, 0],
        [0, 148],
      ],
    },
  ];

  (
    [
      ["PROJECT", "SKETCHBENCH"],
      ["DRAWING", "SYSTEM ARCHITECTURE"],
      ["DRAWN BY", "FINTONLABS"],
      ["REV", "A     SCALE NTS"],
    ] as const
  ).forEach(([key, value], row) => {
    els.push(text(1336, 752 + 37 * row, key, 12, LETTERING, MUTED));
    els.push(text(1460, 750 + 37 * row, value, 16));
  });

  return els;
};

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

/** Draw the architecture sheet on a first visit with an empty canvas. */
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

  // Bound arrows need edge-to-edge geometry before conversion (see canvasOps).
  const elements = convertToExcalidrawElements(
    routeBoundArrows(buildSheet(), []) as ExcalidrawElementSkeleton[],
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

// Canvas operations invoked by the AI server over the bridge. Each method maps
// to one tool (see ai-server/src/tools.mjs) and returns plain JSON.

import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToBlob,
  getCommonBounds,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import { getDataURL } from "@excalidraw/excalidraw/data/blob";
import {
  getBoundTextElement,
  getContainerElement,
  isArrowElement,
  isTextElement,
  newElementWith,
  redrawTextBoundingBox,
  refreshTextDimensions,
  Scene,
  updateBindings,
} from "@excalidraw/element";
import { randomId } from "@excalidraw/common";

import type {
  ExcalidrawElement,
  ExcalidrawTextContainer,
  NonDeletedExcalidrawElement,
} from "@excalidraw/element/types";
import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  DASHBOARD_TEMPLATES,
  getDashboardTemplate,
} from "./templates/dashboards";

type Params = Record<string, any>;

const MAX_EXPORT_SIZE = 1568;
const PLACEMENT_GAP = 160;
const ARROW_GAP = 4;

const round = (n: number) => Math.round(n);

const liveElements = (api: ExcalidrawImperativeAPI) =>
  api.getSceneElements() as readonly NonDeletedExcalidrawElement[];

const contentBounds = (elements: readonly ExcalidrawElement[]) =>
  elements.length ? getCommonBounds(elements).map(round) : null;

// ---------------------------------------------------------------------------
// get_scene
// ---------------------------------------------------------------------------

const describeElement = (
  el: NonDeletedExcalidrawElement,
  elementsMap: Map<string, ExcalidrawElement>,
) => {
  const out: Record<string, unknown> = {
    id: el.id,
    type: el.type,
    x: round(el.x),
    y: round(el.y),
    width: round(el.width),
    height: round(el.height),
  };
  if (el.angle) {
    out.angle = Number(el.angle.toFixed(3));
  }
  if (isTextElement(el)) {
    out.text = el.originalText ?? el.text;
  } else {
    const label = getBoundTextElement(el, elementsMap as any);
    if (label) {
      out.label = label.originalText ?? label.text;
    }
  }
  if (el.strokeColor !== "#1e1e1e") {
    out.strokeColor = el.strokeColor;
  }
  if (el.backgroundColor !== "transparent") {
    out.backgroundColor = el.backgroundColor;
  }
  if (isArrowElement(el)) {
    out.start = el.startBinding?.elementId ?? null;
    out.end = el.endBinding?.elementId ?? null;
  }
  if (el.frameId) {
    out.frameId = el.frameId;
  }
  if (el.groupIds.length) {
    out.groupIds = el.groupIds;
  }
  if (el.link) {
    out.link = el.link;
  }
  return out;
};

const getScene = (api: ExcalidrawImperativeAPI, params: Params) => {
  const elements = liveElements(api);
  const elementsMap = new Map(elements.map((el) => [el.id, el]));
  const selectedIds = Object.keys(api.getAppState().selectedElementIds);
  const source = params.selectedOnly
    ? elements.filter((el) => selectedIds.includes(el.id))
    : elements;

  return {
    count: elements.length,
    bounds: contentBounds(elements),
    selectedIds,
    // Labels are folded into their container rather than listed separately.
    elements: source
      .filter((el) => !(isTextElement(el) && el.containerId))
      .map((el) => describeElement(el, elementsMap)),
  };
};

// ---------------------------------------------------------------------------
// add_elements / add_mermaid
// ---------------------------------------------------------------------------

/** Rename skeleton ids that already exist on the canvas, and fix references. */
const dedupeSkeletonIds = (
  skeletons: Params[],
  existing: Set<string>,
): { skeletons: Params[]; renamed: Record<string, string> } => {
  const renamed: Record<string, string> = {};
  for (const s of skeletons) {
    if (s.id && existing.has(s.id)) {
      renamed[s.id] = `${s.id}-${randomId().slice(0, 6)}`;
    }
  }
  if (!Object.keys(renamed).length) {
    return { skeletons, renamed };
  }
  const remap = (id: string) => renamed[id] ?? id;
  return {
    renamed,
    skeletons: skeletons.map((s) => ({
      ...s,
      id: s.id ? remap(s.id) : s.id,
      start: s.start?.id ? { ...s.start, id: remap(s.start.id) } : s.start,
      end: s.end?.id ? { ...s.end, id: remap(s.end.id) } : s.end,
      children: Array.isArray(s.children) ? s.children.map(remap) : s.children,
    })),
  };
};

const normalizeSkeleton = (s: Params): Params => {
  const next = { ...s };
  if (next.type === "text" && typeof next.text !== "string") {
    next.text = next.label?.text ?? "";
  }
  if (next.type === "frame" && !Array.isArray(next.children)) {
    next.children = [];
  }
  if (Array.isArray(next.points) && !next.points.length) {
    delete next.points;
  }
  return next;
};

const commitNewElements = (
  api: ExcalidrawImperativeAPI,
  created: readonly ExcalidrawElement[],
  select: boolean,
  /** Existing elements changed alongside, e.g. new arrow bindings. */
  touched: readonly ExcalidrawElement[] = [],
) => {
  const topLevel = created.filter(
    (el) => !(isTextElement(el) && el.containerId),
  );
  const touchedById = new Map(touched.map((el) => [el.id, el]));
  // A new element may reuse the id of a deleted one: replace it, with a higher
  // version so collaborators' reconciliation keeps the new element.
  const previous = new Map(
    api.getSceneElementsIncludingDeleted().map((el) => [el.id, el]),
  );
  const replaced = new Set<string>();
  const fresh = created.map((el) => {
    const prev = previous.get(el.id);
    if (!prev) {
      return el;
    }
    replaced.add(el.id);
    return { ...el, version: prev.version + 1 };
  });
  api.updateScene({
    elements: [
      ...api
        .getSceneElementsIncludingDeleted()
        .filter((el) => !replaced.has(el.id))
        .map((el) => touchedById.get(el.id) ?? el),
      ...fresh,
    ],
    appState: select
      ? {
          selectedElementIds: Object.fromEntries(
            topLevel.map((el) => [el.id, true as const]),
          ),
        }
      : undefined,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return topLevel;
};

type Box = { x: number; y: number; width: number; height: number };

/**
 * Give bound arrows centre-to-centre geometry. The converter derives each
 * binding's fixed point from the skeleton's endpoints, so an arrow left at its
 * default 100px length binds to a point outside the target shape.
 */
const routeBoundArrows = (
  skeletons: Params[],
  scene: readonly ExcalidrawElement[],
): Params[] => {
  const boxes = new Map<string, Box>();
  for (const el of scene) {
    boxes.set(el.id, el);
  }
  for (const s of skeletons) {
    if (s.id && s.type !== "arrow" && s.type !== "line") {
      boxes.set(s.id, {
        x: s.x,
        y: s.y,
        width: s.width ?? 100,
        height: s.height ?? 100,
      });
    }
  }
  const center = (box: Box) => [box.x + box.width / 2, box.y + box.height / 2];
  // Where the ray from the box centre along (dx, dy) leaves the box, plus a
  // small gap, so the fixed point lands on the shape's edge.
  const edgePoint = (
    box: Box,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
  ) => {
    const length = Math.hypot(dx, dy) || 1;
    const t = Math.min(
      dx ? box.width / 2 / Math.abs(dx) : Infinity,
      dy ? box.height / 2 / Math.abs(dy) : Infinity,
    );
    const gap = ARROW_GAP / length;
    return [cx + dx * (t + gap), cy + dy * (t + gap)];
  };

  return skeletons.map((s) => {
    if (s.type !== "arrow" || Array.isArray(s.points)) {
      return s;
    }
    const from = s.start?.id && boxes.get(s.start.id);
    const to = s.end?.id && boxes.get(s.end.id);
    if (!from || !to) {
      return s;
    }
    const [fx, fy] = center(from);
    const [tx, ty] = center(to);
    const [sx, sy] = edgePoint(from, fx, fy, tx - fx, ty - fy);
    const [ex, ey] = edgePoint(to, tx, ty, fx - tx, fy - ty);
    return {
      ...s,
      x: sx,
      y: sy,
      width: Math.abs(ex - sx),
      height: Math.abs(ey - sy),
      points: [
        [0, 0],
        [ex - sx, ey - sy],
      ],
    };
  });
};

/**
 * The converter only binds arrows to shapes in the same batch. Bind arrow ends
 * that reference shapes already on the canvas, registering the arrow on each
 * target's boundElements so later moves re-route it.
 */
const bindToExistingShapes = (
  skeletons: Params[],
  converted: readonly ExcalidrawElement[],
  live: readonly ExcalidrawElement[],
) => {
  const liveById = new Map(live.map((el) => [el.id, el]));
  const touched = new Map<string, ExcalidrawElement>();
  const created = converted.map((el) => {
    const skeleton = skeletons.find((s) => s.id === el.id);
    if (!skeleton || !isArrowElement(el)) {
      return el;
    }
    let arrow = el;
    for (const [end, key] of [
      ["start", "startBinding"],
      ["end", "endBinding"],
    ] as const) {
      const target = skeleton[end]?.id && liveById.get(skeleton[end].id);
      if (!target || arrow[key]) {
        continue;
      }
      const [px, py] =
        arrow.points[end === "start" ? 0 : arrow.points.length - 1];
      const fixedPoint = [
        (arrow.x + px - target.x) / (target.width || 1),
        (arrow.y + py - target.y) / (target.height || 1),
      ];
      arrow = {
        ...arrow,
        [key]: { elementId: target.id, mode: "orbit", fixedPoint },
      };
      const current = touched.get(target.id) ?? target;
      touched.set(
        target.id,
        newElementWith(current, {
          boundElements: [
            ...(current.boundElements ?? []),
            { id: arrow.id, type: "arrow" as const },
          ],
        }),
      );
    }
    return arrow;
  });
  return { created, touched: [...touched.values()] };
};

const addElements = (api: ExcalidrawImperativeAPI, params: Params) => {
  if (!Array.isArray(params.elements) || !params.elements.length) {
    throw new Error("`elements` must be a non-empty array.");
  }
  // Only live elements block an id; deleted ones are replaced on commit.
  const existing = new Set(liveElements(api).map((el) => el.id));
  const { skeletons, renamed } = dedupeSkeletonIds(
    params.elements.map(normalizeSkeleton),
    existing,
  );
  const live = liveElements(api);
  // Arrows need known ids so they can be bound to existing shapes afterwards.
  const routed = routeBoundArrows(skeletons, live).map((s) =>
    s.type === "arrow" && !s.id ? { ...s, id: randomId() } : s,
  );
  const converted = convertToExcalidrawElements(
    routed as ExcalidrawElementSkeleton[],
    { regenerateIds: false },
  );
  const { created, touched } = bindToExistingShapes(routed, converted, live);
  const topLevel = commitNewElements(
    api,
    created,
    params.select !== false,
    touched,
  );
  return {
    created: topLevel.map((el) => ({ id: el.id, type: el.type })),
    ...(Object.keys(renamed).length
      ? {
          renamedIds: renamed,
          note: "Some ids already existed and were renamed.",
        }
      : {}),
  };
};

/** Move a batch to params.x/y, or else to the right of existing content. */
const placeBesideContent = (
  api: ExcalidrawImperativeAPI,
  elements: readonly ExcalidrawElement[],
  params: Params,
) => {
  const [minX, minY] = getCommonBounds(elements);
  const current = liveElements(api);
  let targetX = params.x;
  let targetY = params.y;
  if (typeof targetX !== "number" || typeof targetY !== "number") {
    if (current.length) {
      const [, cMinY, cMaxX] = getCommonBounds(current);
      targetX = cMaxX + PLACEMENT_GAP;
      targetY = cMinY;
    } else {
      targetX = 0;
      targetY = 0;
    }
  }
  const dx = targetX - minX;
  const dy = targetY - minY;
  return elements.map((el) =>
    newElementWith(el, { x: el.x + dx, y: el.y + dy }),
  );
};

const listTemplates = () => ({
  templates: DASHBOARD_TEMPLATES.map(({ id, name, description }) => ({
    id,
    name,
    description,
  })),
});

export const insertTemplate = (
  api: ExcalidrawImperativeAPI,
  params: Params,
) => {
  const template = getDashboardTemplate(String(params.template ?? ""));
  if (!template) {
    throw new Error(
      `Unknown template. Available: ${DASHBOARD_TEMPLATES.map((t) => t.id).join(
        ", ",
      )}`,
    );
  }
  // One group so the whole dashboard moves as a unit; double-click to edit.
  const groupId = randomId();
  const converted = convertToExcalidrawElements(
    template.build() as ExcalidrawElementSkeleton[],
    { regenerateIds: true },
  ).map((el) => ({ ...el, groupIds: [groupId, ...el.groupIds] }));
  const placed = placeBesideContent(api, converted, params);
  commitNewElements(api, placed, false);
  focusView(api, { ids: placed.map((el) => el.id) });
  return {
    template: template.id,
    groupId,
    elements: placed.length,
    bounds: getCommonBounds(placed).map(round),
  };
};

const addMermaid = async (api: ExcalidrawImperativeAPI, params: Params) => {
  const definition = String(params.definition ?? "").trim();
  if (!definition) {
    throw new Error("`definition` is empty.");
  }
  const { parseMermaidToExcalidraw } = await import(
    "@excalidraw/mermaid-to-excalidraw"
  );
  const { elements: skeletons, files } = await parseMermaidToExcalidraw(
    definition,
  );
  const converted = convertToExcalidrawElements(
    skeletons as ExcalidrawElementSkeleton[],
    { regenerateIds: true },
  );
  if (!converted.length) {
    throw new Error("Mermaid produced no elements.");
  }

  const placed = placeBesideContent(api, converted, params);
  if (files) {
    api.addFiles(Object.values(files));
  }
  const topLevel = commitNewElements(api, placed, true);
  return {
    created: topLevel.map((el) => ({ id: el.id, type: el.type })),
    bounds: getCommonBounds(placed).map(round),
  };
};

// ---------------------------------------------------------------------------
// update_elements / delete_elements / clear_canvas
// ---------------------------------------------------------------------------

const STYLE_KEYS = [
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeWidth",
  "strokeStyle",
  "roughness",
  "opacity",
  "angle",
] as const;

const updateElements = (api: ExcalidrawImperativeAPI, params: Params) => {
  if (!Array.isArray(params.updates) || !params.updates.length) {
    throw new Error("`updates` must be a non-empty array.");
  }
  // Work on copies in a scratch Scene so Excalidraw's own helpers can
  // re-route bound arrows and re-flow labels, then commit in one step.
  const copies = api
    .getSceneElementsIncludingDeleted()
    .map((el) => ({ ...el })) as ExcalidrawElement[];
  const scene = new Scene(copies, { skipValidation: true });
  const map = scene.getNonDeletedElementsMap();

  const updated: string[] = [];
  const missing: string[] = [];
  const opts = { informMutation: false, isDragging: false };

  for (const update of params.updates as Params[]) {
    const el = map.get(update.id);
    if (!el) {
      missing.push(update.id);
      continue;
    }
    const patch: Params = {};
    for (const key of STYLE_KEYS) {
      if (update[key] !== undefined) {
        patch[key] = update[key];
      }
    }
    for (const key of ["x", "y", "width", "height"] as const) {
      if (typeof update[key] === "number") {
        patch[key] = update[key];
      }
    }
    if (Object.keys(patch).length) {
      scene.mutateElement(el as any, patch, opts);
    }

    const label = isTextElement(el) ? null : getBoundTextElement(el, map);
    if (typeof update.text === "string") {
      const textEl = isTextElement(el) ? el : label;
      if (!textEl) {
        missing.push(`${update.id} (has no text or label)`);
      } else {
        const container = getContainerElement(
          textEl,
          map,
        ) as ExcalidrawTextContainer | null;
        const dims = refreshTextDimensions(textEl, container, map, update.text);
        scene.mutateElement(
          textEl as any,
          { originalText: update.text, ...(dims ?? { text: update.text }) },
          opts,
        );
      }
    }
    if (label) {
      redrawTextBoundingBox(label, el, scene);
    }
    updateBindings(el, scene, api.getAppState());
    updated.push(update.id);
  }

  if (updated.length) {
    api.updateScene({
      elements: scene.getElementsIncludingDeleted(),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  }
  return { updated, ...(missing.length ? { notFound: missing } : {}) };
};

const deleteByIds = (api: ExcalidrawImperativeAPI, ids: Set<string>) => {
  const deleted: string[] = [];
  const next = api.getSceneElementsIncludingDeleted().map((el) => {
    const hit =
      !el.isDeleted &&
      (ids.has(el.id) ||
        (isTextElement(el) && el.containerId && ids.has(el.containerId)));
    if (!hit) {
      return el;
    }
    if (ids.has(el.id)) {
      deleted.push(el.id);
    }
    return newElementWith(el, { isDeleted: true });
  });
  api.updateScene({
    elements: next,
    appState: { selectedElementIds: {} },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  return deleted;
};

const deleteElements = (api: ExcalidrawImperativeAPI, params: Params) => {
  const ids = new Set<string>((params.ids ?? []).map(String));
  const deleted = deleteByIds(api, ids);
  const notFound = [...ids].filter((id) => !deleted.includes(id));
  return { deleted, ...(notFound.length ? { notFound } : {}) };
};

const clearCanvas = (api: ExcalidrawImperativeAPI) => {
  const ids = new Set(liveElements(api).map((el) => el.id));
  return { deleted: deleteByIds(api, ids).length };
};

// ---------------------------------------------------------------------------
// export_image / focus_view
// ---------------------------------------------------------------------------

const pickElements = (api: ExcalidrawImperativeAPI, ids?: unknown) => {
  const elements = liveElements(api);
  if (!Array.isArray(ids) || !ids.length) {
    return elements;
  }
  const wanted = new Set(ids.map(String));
  // Include labels of the requested containers so they render.
  return elements.filter(
    (el) =>
      wanted.has(el.id) ||
      (isTextElement(el) && el.containerId && wanted.has(el.containerId)),
  );
};

const exportImage = async (api: ExcalidrawImperativeAPI, params: Params) => {
  const elements = pickElements(api, params.ids);
  if (!elements.length) {
    throw new Error("Nothing to render: the canvas (or selection) is empty.");
  }
  const appState = api.getAppState();
  const blob = await exportToBlob({
    elements,
    appState: {
      ...appState,
      exportBackground: true,
      exportWithDarkMode: false,
      viewBackgroundColor: "#ffffff",
    },
    files: api.getFiles(),
    mimeType: MIME_TYPES.png,
    // Up to 2x for legibility, but never past what Claude's vision uses.
    getDimensions: (width: number, height: number) => {
      const scale = Math.min(2, MAX_EXPORT_SIZE / Math.max(width, height));
      return {
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        scale,
      };
    },
    exportPadding: 24,
  });
  const dataURL = await getDataURL(blob);
  const bitmap = await createImageBitmap(blob);
  const result = {
    mimeType: MIME_TYPES.png,
    data: dataURL.slice(dataURL.indexOf(",") + 1),
    width: bitmap.width,
    height: bitmap.height,
  };
  bitmap.close();
  return result;
};

const focusView = (api: ExcalidrawImperativeAPI, params: Params) => {
  const elements = pickElements(api, params.ids);
  if (!elements.length) {
    return { focused: 0 };
  }
  api.setViewport({
    target: elements,
    fit: "scale-down",
    animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    offsets: { ui: true },
  });
  return { focused: elements.length };
};

// ---------------------------------------------------------------------------

export const CANVAS_METHODS: Record<
  string,
  (api: ExcalidrawImperativeAPI, params: Params) => unknown
> = {
  getScene,
  addElements,
  updateElements,
  deleteElements,
  addMermaid,
  exportImage,
  focusView,
  clearCanvas,
  listTemplates,
  insertTemplate,
};

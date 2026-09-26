// Dashboard widgets drawn as Excalidraw element skeletons.
//
// Colour follows the dataviz method: categorical series take fixed slots in a
// validated order (max three per chart, so every pair clears the colour-vision
// floors), text always wears ink tokens rather than series colour, every chart
// with two or more series has a legend plus direct end labels, and status
// colours appear only on KPI deltas, always with a ▲/▼ label beside them.

import { FONT_FAMILY } from "@excalidraw/common";

export type Skeleton = Record<string, any>;

/** Categorical slots, fixed order. Validated light + dark; three max per chart. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;

/** Ordinal blue ramp, light->dark, starting at step 250 so marks clear 2:1. */
export const ORDINAL = [
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
] as const;

/** Sequential blue ramp for heatmaps: near-zero recedes toward the surface. */
export const SEQUENTIAL = [
  "#cde2fb",
  "#b7d3f6",
  "#9ec5f4",
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#104281",
] as const;

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

const INK = "#1e1e1e";
const INK_2 = "#495057";
const MUTED = "#868e96";
const RULE = "#dee2e6";
const GRID = "#eef0f2";

const FONT = FONT_FAMILY.Nunito;

const base = {
  roughness: 0,
  strokeWidth: 1,
  roundness: null,
};

export const text = (
  x: number,
  y: number,
  value: string,
  opts: { size?: number; color?: string; align?: "left" | "center" } = {},
): Skeleton => ({
  type: "text",
  x,
  y,
  text: value,
  fontSize: opts.size ?? 14,
  fontFamily: FONT,
  strokeColor: opts.color ?? INK,
  textAlign: opts.align ?? "left",
});

const rect = (
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Skeleton = {},
): Skeleton => ({
  ...base,
  type: "rectangle",
  x,
  y,
  width,
  height,
  strokeColor: RULE,
  backgroundColor: "transparent",
  fillStyle: "solid",
  ...opts,
});

const filled = (
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): Skeleton =>
  rect(x, y, Math.max(width, 1), Math.max(height, 1), {
    strokeColor: color,
    backgroundColor: color,
    strokeWidth: 1,
  });

const hline = (
  x: number,
  y: number,
  width: number,
  color = GRID,
): Skeleton => ({
  ...base,
  type: "line",
  x,
  y,
  strokeColor: color,
  points: [
    [0, 0],
    [width, 0],
  ],
});

const panel = (x: number, y: number, w: number, h: number, title: string) => [
  rect(x, y, w, h),
  text(x + 16, y + 12, title, { size: 16 }),
];

const legend = (x: number, y: number, names: readonly string[]): Skeleton[] => {
  const out: Skeleton[] = [];
  let cursor = x;
  names.forEach((name, i) => {
    out.push(filled(cursor, y + 4, 10, 10, SERIES[i]));
    out.push(text(cursor + 16, y, name, { size: 12, color: INK_2 }));
    cursor += 28 + name.length * 7;
  });
  return out;
};

const niceMax = (max: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(max || 1));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= max) ?? 10;
  return step * magnitude;
};

export const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1_000_000) {
    return `${+(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${+(n / 1_000).toFixed(1)}k`;
  }
  return `${+n.toFixed(1)}`;
};

/** Plot frame shared by line and bar charts: gridlines + y ticks + x labels. */
const plotFrame = (
  x: number,
  y: number,
  w: number,
  h: number,
  max: number,
  xLabels: readonly string[],
  unit: string,
) => {
  const out: Skeleton[] = [];
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const ty = y + h - (h * i) / ticks;
    out.push(hline(x, ty, w, i === 0 ? RULE : GRID));
    out.push(
      text(x - 44, ty - 8, `${unit}${formatNumber((max * i) / ticks)}`, {
        size: 11,
        color: MUTED,
      }),
    );
  }
  const every = Math.ceil(xLabels.length / 8);
  xLabels.forEach((label, i) => {
    if (i % every === 0) {
      const lx = x + (w * (i + 0.5)) / xLabels.length - label.length * 3;
      out.push(text(lx, y + h + 6, label, { size: 11, color: MUTED }));
    }
  });
  return out;
};

export type Series = { name: string; values: readonly number[] };

type ChartOpts = {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  series: readonly Series[];
  xLabels: readonly string[];
  unit?: string;
};

const assertSeriesCount = (series: readonly Series[]) => {
  if (series.length > SERIES.length) {
    throw new Error(
      `Charts take at most ${SERIES.length} series; fold the rest into "Other".`,
    );
  }
};

/** Multi-series line chart with legend (2+ series) and direct end labels. */
export const lineChart = ({
  x,
  y,
  w,
  h,
  title,
  series,
  xLabels,
  unit = "",
}: ChartOpts): Skeleton[] => {
  assertSeriesCount(series);
  const out = panel(x, y, w, h, title);
  const multi = series.length > 1;
  if (multi) {
    out.push(
      ...legend(
        x + 16,
        y + 38,
        series.map((s) => s.name),
      ),
    );
  }
  const px = x + 60;
  const py = y + (multi ? 66 : 48);
  // Room on the right for direct labels like "Expansion $44k".
  const pw = w - 60 - 136;
  const ph = h - (py - y) - 32;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values)));
  out.push(...plotFrame(px, py, pw, ph, max, xLabels, unit));

  const step = pw / xLabels.length;
  const endLabels: { y: number; name: string; value: number }[] = [];
  series.forEach((s, i) => {
    const pts = s.values.map((v, j) => [step * (j + 0.5), ph - (ph * v) / max]);
    const [ox, oy] = pts[0];
    out.push({
      ...base,
      type: "line",
      x: px + ox,
      y: py + oy,
      strokeColor: SERIES[i],
      strokeWidth: 2,
      points: pts.map(([a, b]) => [a - ox, b - oy]),
    });
    const [lx, ly] = pts[pts.length - 1];
    out.push({
      ...base,
      type: "ellipse",
      x: px + lx - 4,
      y: py + ly - 4,
      width: 8,
      height: 8,
      strokeColor: SERIES[i],
      backgroundColor: SERIES[i],
      fillStyle: "solid",
    });
    endLabels.push({
      y: py + ly,
      name: s.name,
      value: s.values[s.values.length - 1],
    });
  });

  // Direct labels at line ends, nudged apart so they never collide.
  endLabels.sort((a, b) => a.y - b.y);
  let last = -Infinity;
  for (const label of endLabels) {
    const ly = Math.max(label.y - 9, last + 18);
    last = ly;
    out.push(
      text(
        px + pw + 10,
        ly,
        multi
          ? `${label.name} ${unit}${formatNumber(label.value)}`
          : `${unit}${formatNumber(label.value)}`,
        { size: 12, color: INK_2 },
      ),
    );
  }
  return out;
};

/** Grouped (or single) vertical bar chart. 2px surface gap between bars. */
export const barChart = ({
  x,
  y,
  w,
  h,
  title,
  series,
  xLabels,
  unit = "",
  stacked = false,
}: ChartOpts & { stacked?: boolean }): Skeleton[] => {
  assertSeriesCount(series);
  const out = panel(x, y, w, h, title);
  const multi = series.length > 1;
  if (multi) {
    out.push(
      ...legend(
        x + 16,
        y + 38,
        series.map((s) => s.name),
      ),
    );
  }
  const px = x + 60;
  const py = y + (multi ? 66 : 48);
  const pw = w - 60 - 24;
  const ph = h - (py - y) - 32;
  const totals = xLabels.map((_, j) =>
    stacked
      ? series.reduce((sum, s) => sum + s.values[j], 0)
      : Math.max(...series.map((s) => s.values[j])),
  );
  const max = niceMax(Math.max(...totals));
  out.push(...plotFrame(px, py, pw, ph, max, xLabels, unit));

  const slot = pw / xLabels.length;
  const groupWidth = slot * 0.64;
  const barWidth = stacked ? groupWidth : groupWidth / series.length;
  xLabels.forEach((_, j) => {
    const gx = px + slot * j + (slot - groupWidth) / 2;
    let stackTop = py + ph;
    series.forEach((s, i) => {
      const bh = (ph * s.values[j]) / max;
      if (stacked) {
        out.push(filled(gx, stackTop - bh, barWidth, bh - 2, SERIES[i]));
        stackTop -= bh;
      } else {
        out.push(
          filled(gx + barWidth * i, py + ph - bh, barWidth - 2, bh, SERIES[i]),
        );
      }
    });
  });
  return out;
};

/** Ranked horizontal bars: one series, so the title names it and no legend. */
export const rankBars = ({
  x,
  y,
  w,
  h,
  title,
  rows,
  unit = "",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: readonly { label: string; value: number }[];
  unit?: string;
}): Skeleton[] => {
  const out = panel(x, y, w, h, title);
  const max = Math.max(...rows.map((r) => r.value));
  const top = y + 48;
  const rowH = Math.min(32, (h - 60) / rows.length);
  const labelW = 120;
  const barMax = w - labelW - 32 - 64;
  rows.forEach((row, i) => {
    const ry = top + i * rowH;
    out.push(text(x + 16, ry + 2, row.label, { size: 12, color: INK_2 }));
    const bw = (barMax * row.value) / max;
    out.push(filled(x + 16 + labelW, ry + 4, bw, rowH - 12, SERIES[0]));
    out.push(
      text(
        x + 16 + labelW + bw + 8,
        ry + 2,
        `${unit}${formatNumber(row.value)}`,
        {
          size: 12,
          color: INK_2,
        },
      ),
    );
  });
  return out;
};

/** Funnel: ordinal blue steps, stage names and values in ink. */
export const funnel = ({
  x,
  y,
  w,
  h,
  title,
  stages,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  stages: readonly { label: string; value: number }[];
}): Skeleton[] => {
  const out = panel(x, y, w, h, title);
  const top = y + 48;
  const rowH = (h - 60) / stages.length;
  const labelW = 150;
  const barMax = w - labelW - 32;
  const first = stages[0].value;
  stages.forEach((stage, i) => {
    const ry = top + i * rowH;
    const bw = (barMax * stage.value) / first;
    const color =
      ORDINAL[
        Math.round((i * (ORDINAL.length - 1)) / (stages.length - 1 || 1))
      ];
    out.push(
      text(x + 16, ry + rowH / 2 - 18, stage.label, { size: 12, color: INK_2 }),
    );
    out.push(
      text(
        x + 16,
        ry + rowH / 2,
        `${formatNumber(stage.value)} · ${Math.round(
          (stage.value / first) * 100,
        )}%`,
        { size: 11, color: MUTED },
      ),
    );
    out.push(
      filled(x + 16 + labelW + (barMax - bw) / 2, ry + 4, bw, rowH - 8, color),
    );
  });
  return out;
};

/** KPI tile: label, value, and a delta that carries status by icon + words. */
export const kpi = ({
  x,
  y,
  w,
  h,
  label,
  value,
  delta,
  status,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
  delta: string;
  status: keyof typeof STATUS;
}): Skeleton[] => [
  rect(x, y, w, h),
  filled(x, y, 4, h, STATUS[status]),
  text(x + 16, y + 12, label, { size: 12, color: MUTED }),
  text(x + 16, y + 32, value, { size: 28 }),
  text(x + 16, y + h - 26, delta, { size: 12, color: INK_2 }),
];

/** Heatmap (e.g. cohort retention): sequential blue, values printed in cells. */
export const heatmap = ({
  x,
  y,
  w,
  h,
  title,
  rows,
  cols,
  values,
  unit = "%",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: readonly string[];
  cols: readonly string[];
  values: readonly (readonly (number | null)[])[];
  unit?: string;
}): Skeleton[] => {
  const out = panel(x, y, w, h, title);
  const gx = x + 96;
  const gy = y + 70;
  const cw = (w - 96 - 16) / cols.length;
  const ch = (h - 70 - 40) / rows.length;
  const present = values.flat().filter((v): v is number => v !== null);
  const low = Math.min(...present);
  const high = Math.max(...present);
  cols.forEach((c, j) =>
    out.push(text(gx + cw * j + 6, y + 46, c, { size: 11, color: MUTED })),
  );
  rows.forEach((r, i) => {
    out.push(
      text(x + 16, gy + ch * i + ch / 2 - 8, r, { size: 12, color: INK_2 }),
    );
    values[i].forEach((v, j) => {
      if (v === null) {
        return;
      }
      // Scale to the data's own range so small differences stay visible.
      const t = high > low ? (v - low) / (high - low) : 1;
      const step = Math.min(
        SEQUENTIAL.length - 1,
        Math.floor(t * SEQUENTIAL.length),
      );
      out.push(
        filled(gx + cw * j, gy + ch * i, cw - 2, ch - 2, SEQUENTIAL[step]),
      );
      out.push(
        text(gx + cw * j + 6, gy + ch * i + ch / 2 - 8, `${v}${unit}`, {
          size: 11,
          color: step >= 6 ? "#ffffff" : INK,
        }),
      );
    });
  });
  // Scale legend: low -> high.
  const ly = y + h - 28;
  out.push(text(gx, ly, `${low}${unit}`, { size: 11, color: MUTED }));
  [0, 3, 6, 9, 11].forEach((s, k) =>
    out.push(filled(gx + 32 + k * 22, ly + 3, 20, 10, SEQUENTIAL[s])),
  );
  out.push(
    text(gx + 32 + 5 * 22 + 6, ly, `${high}${unit}`, {
      size: 11,
      color: MUTED,
    }),
  );
  return out;
};

/** Simple table: muted header, hairline row rules, ink cells. */
export const table = ({
  x,
  y,
  w,
  h,
  title,
  columns,
  rows,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  columns: readonly { label: string; width: number }[];
  rows: readonly (readonly string[])[];
}): Skeleton[] => {
  const out = panel(x, y, w, h, title);
  const top = y + 46;
  const rowH = Math.min(30, (h - 56) / (rows.length + 1));
  let cx = x + 16;
  const xs = columns.map((c) => {
    const at = cx;
    cx += c.width;
    return at;
  });
  columns.forEach((c, j) =>
    out.push(text(xs[j], top, c.label, { size: 11, color: MUTED })),
  );
  rows.forEach((row, i) => {
    const ry = top + rowH * (i + 1);
    out.push(hline(x + 16, ry - 6, w - 32, GRID));
    row.forEach((cell, j) =>
      out.push(text(xs[j], ry, cell, { size: 12, color: j ? INK_2 : INK })),
    );
  });
  return out;
};

/** Service status rows: status dot + service + status word + metric. */
export const statusList = ({
  x,
  y,
  w,
  h,
  title,
  items,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  items: readonly {
    name: string;
    status: keyof typeof STATUS;
    word: string;
    metric: string;
  }[];
}): Skeleton[] => {
  const out = panel(x, y, w, h, title);
  const rowH = Math.min(32, (h - 56) / items.length);
  items.forEach((item, i) => {
    const ry = y + 48 + rowH * i;
    out.push({
      ...base,
      type: "ellipse",
      x: x + 16,
      y: ry + 4,
      width: 10,
      height: 10,
      strokeColor: STATUS[item.status],
      backgroundColor: STATUS[item.status],
      fillStyle: "solid",
    });
    out.push(text(x + 34, ry, item.name, { size: 13 }));
    out.push(text(x + w * 0.5, ry, item.word, { size: 12, color: INK_2 }));
    out.push(text(x + w * 0.75, ry, item.metric, { size: 12, color: MUTED }));
  });
  return out;
};

/** Dashboard header: title, subtitle and a hairline rule. */
export const header = (
  x: number,
  y: number,
  w: number,
  title: string,
  subtitle: string,
): Skeleton[] => [
  text(x, y, title, { size: 28 }),
  text(x, y + 40, subtitle, { size: 13, color: MUTED }),
  hline(x, y + 66, w, RULE),
];

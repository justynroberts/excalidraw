// Ten general-purpose dashboard templates, ready to drop onto the canvas and
// edit. Data is realistic placeholder data; every chart with two or more
// series carries a legend and direct labels (see widgets.ts).

import {
  barChart,
  funnel,
  header,
  heatmap,
  kpi,
  lineChart,
  rankBars,
  statusList,
  table,
} from "./widgets";

import type { Skeleton } from "./widgets";

export type DashboardTemplate = {
  id: string;
  name: string;
  description: string;
  build: () => Skeleton[];
};

const W = 1200;
const GAP = 16;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKS = [
  "W1",
  "W2",
  "W3",
  "W4",
  "W5",
  "W6",
  "W7",
  "W8",
  "W9",
  "W10",
  "W11",
  "W12",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Grid: header, a row of four KPI tiles, then two rows of panels.
const KPI_Y = 88;
const KPI_H = 112;
const KPI_W = (W - GAP * 3) / 4;
const ROW1_Y = KPI_Y + KPI_H + GAP;
const ROW1_H = 320;
const ROW2_Y = ROW1_Y + ROW1_H + GAP;
const ROW2_H = 280;
const WIDE = 752;
const NARROW = W - WIDE - GAP;
const HALF = (W - GAP) / 2;

type KpiSpec = [
  label: string,
  value: string,
  delta: string,
  status: "good" | "warning" | "serious" | "critical",
];

const kpiRow = (specs: readonly KpiSpec[]) =>
  specs.flatMap(([label, value, delta, status], i) =>
    kpi({
      x: i * (KPI_W + GAP),
      y: KPI_Y,
      w: KPI_W,
      h: KPI_H,
      label,
      value,
      delta,
      status,
    }),
  );

export const DASHBOARD_TEMPLATES: readonly DashboardTemplate[] = [
  {
    id: "saas-metrics",
    name: "SaaS metrics",
    description: "MRR growth, churn, net revenue retention, plan mix",
    build: () => [
      ...header(0, 0, W, "SaaS metrics", "Last 12 months · all plans"),
      ...kpiRow([
        ["MRR", "$482k", "▲ 6.1% vs last month", "good"],
        ["Active customers", "3,914", "▲ 142 net new", "good"],
        ["Logo churn", "2.4%", "▲ 0.3 pts, above 2% target", "serious"],
        ["Net revenue retention", "112%", "▲ 2 pts vs last quarter", "good"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Monthly recurring revenue",
        unit: "$",
        xLabels: MONTHS,
        series: [
          {
            name: "New",
            values: [48, 52, 55, 61, 58, 66, 70, 72, 79, 83, 88, 94].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Expansion",
            values: [21, 22, 25, 24, 28, 30, 33, 35, 34, 38, 41, 44].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Churned",
            values: [18, 17, 19, 21, 20, 19, 22, 21, 23, 22, 24, 25].map(
              (v) => v * 1000,
            ),
          },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "MRR by plan",
        unit: "$",
        rows: [
          { label: "Enterprise", value: 212000 },
          { label: "Business", value: 148000 },
          { label: "Team", value: 86000 },
          { label: "Starter", value: 36000 },
        ],
      }),
      ...heatmap({
        x: 0,
        y: ROW2_Y,
        w: WIDE,
        h: ROW2_H,
        title: "Customer retention by signup cohort",
        rows: ["Jul", "Aug", "Sep", "Oct", "Nov"],
        cols: ["M0", "M1", "M2", "M3", "M4"],
        values: [
          [100, 91, 86, 83, 81],
          [100, 93, 88, 85, null],
          [100, 90, 87, null, null],
          [100, 94, null, null, null],
          [100, null, null, null, null],
        ],
      }),
      ...table({
        x: WIDE + GAP,
        y: ROW2_Y,
        w: NARROW,
        h: ROW2_H,
        title: "Largest expansions",
        columns: [
          { label: "Account", width: 170 },
          { label: "Plan", width: 110 },
          { label: "+MRR", width: 90 },
        ],
        rows: [
          ["Northwind", "Enterprise", "$8.4k"],
          ["Globex", "Business", "$5.1k"],
          ["Initech", "Business", "$3.9k"],
          ["Umbrella", "Team", "$2.2k"],
          ["Hooli", "Team", "$1.8k"],
        ],
      }),
    ],
  },
  {
    id: "web-analytics",
    name: "Web analytics",
    description: "Sessions by channel, conversion, top pages",
    build: () => [
      ...header(0, 0, W, "Web analytics", "Last 12 weeks · all properties"),
      ...kpiRow([
        ["Sessions", "1.28M", "▲ 9.4% vs prior period", "good"],
        ["Conversion rate", "3.1%", "▼ 0.2 pts vs prior period", "serious"],
        ["Avg. session", "2m 41s", "▲ 12s vs prior period", "good"],
        ["Bounce rate", "41%", "No change", "warning"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Weekly sessions by channel",
        xLabels: WEEKS,
        series: [
          {
            name: "Organic",
            values: [52, 54, 53, 57, 60, 62, 61, 65, 68, 70, 72, 75].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Paid",
            values: [30, 33, 35, 34, 38, 36, 40, 41, 39, 43, 45, 44].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Direct",
            values: [18, 19, 18, 20, 21, 20, 22, 23, 22, 24, 25, 26].map(
              (v) => v * 1000,
            ),
          },
        ],
      }),
      ...funnel({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Conversion funnel",
        stages: [
          { label: "Visited", value: 128000 },
          { label: "Viewed product", value: 61000 },
          { label: "Added to cart", value: 14200 },
          { label: "Purchased", value: 3970 },
        ],
      }),
      ...table({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Top pages",
        columns: [
          { label: "Page", width: 250 },
          { label: "Views", width: 110 },
          { label: "Avg. time", width: 110 },
        ],
        rows: [
          ["/pricing", "182k", "1m 58s"],
          ["/", "164k", "0m 47s"],
          ["/docs/getting-started", "97k", "4m 12s"],
          ["/blog/launch", "61k", "3m 05s"],
          ["/signup", "44k", "1m 21s"],
        ],
      }),
      ...barChart({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Sessions by device",
        xLabels: DAYS,
        stacked: true,
        series: [
          {
            name: "Desktop",
            values: [62, 65, 64, 66, 58, 31, 28].map((v) => v * 100),
          },
          {
            name: "Mobile",
            values: [48, 50, 52, 51, 55, 60, 63].map((v) => v * 100),
          },
          {
            name: "Tablet",
            values: [8, 9, 8, 9, 10, 13, 14].map((v) => v * 100),
          },
        ],
      }),
    ],
  },
  {
    id: "sales-pipeline",
    name: "Sales pipeline",
    description: "Pipeline stages, bookings vs target, rep leaderboard",
    build: () => [
      ...header(0, 0, W, "Sales pipeline", "Current quarter · all regions"),
      ...kpiRow([
        ["Pipeline value", "$6.2M", "▲ 14% vs last quarter", "good"],
        ["Bookings", "$1.9M", "76% of $2.5M target", "warning"],
        ["Win rate", "27%", "▲ 3 pts vs last quarter", "good"],
        ["Avg. sales cycle", "48 days", "▲ 6 days, slower", "serious"],
      ]),
      ...barChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Monthly bookings vs target",
        unit: "$",
        xLabels: MONTHS.slice(0, 9),
        series: [
          {
            name: "Bookings",
            values: [510, 560, 620, 590, 640, 700, 610, 680, 720].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Target",
            values: [600, 600, 650, 650, 650, 700, 700, 750, 750].map(
              (v) => v * 1000,
            ),
          },
        ],
      }),
      ...funnel({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Deals by stage",
        stages: [
          { label: "Qualified", value: 412 },
          { label: "Discovery", value: 268 },
          { label: "Proposal", value: 141 },
          { label: "Negotiation", value: 77 },
          { label: "Closed won", value: 41 },
        ],
      }),
      ...rankBars({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Bookings by rep",
        unit: "$",
        rows: [
          { label: "A. Okafor", value: 412000 },
          { label: "M. Chen", value: 388000 },
          { label: "S. Patel", value: 301000 },
          { label: "J. Novak", value: 276000 },
          { label: "L. García", value: 219000 },
        ],
      }),
      ...table({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Deals closing this month",
        columns: [
          { label: "Account", width: 170 },
          { label: "Stage", width: 140 },
          { label: "Value", width: 100 },
          { label: "Close", width: 80 },
        ],
        rows: [
          ["Acme Corp", "Negotiation", "$240k", "Oct 12"],
          ["Stark Ind.", "Proposal", "$185k", "Oct 19"],
          ["Wayne Ent.", "Negotiation", "$152k", "Oct 24"],
          ["Soylent", "Proposal", "$96k", "Oct 28"],
          ["Tyrell", "Discovery", "$88k", "Oct 31"],
        ],
      }),
    ],
  },
  {
    id: "marketing",
    name: "Marketing campaigns",
    description: "Leads by source, spend and cost per lead, campaign table",
    build: () => [
      ...header(0, 0, W, "Marketing campaigns", "Last 12 weeks · all channels"),
      ...kpiRow([
        ["Leads", "8,420", "▲ 18% vs prior period", "good"],
        ["Cost per lead", "$41", "▼ $6, cheaper", "good"],
        ["MQL → SQL", "22%", "▼ 2 pts vs prior period", "serious"],
        ["Spend", "$345k", "92% of budget", "warning"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Weekly leads by source",
        xLabels: WEEKS,
        series: [
          {
            name: "Search",
            values: [
              320, 340, 330, 360, 380, 410, 400, 430, 450, 470, 460, 490,
            ],
          },
          {
            name: "Social",
            values: [
              180, 200, 230, 210, 250, 270, 260, 300, 290, 320, 340, 330,
            ],
          },
          {
            name: "Events",
            values: [60, 40, 90, 150, 80, 60, 70, 180, 90, 70, 60, 110],
          },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Spend by channel",
        unit: "$",
        rows: [
          { label: "Search", value: 142000 },
          { label: "Social", value: 98000 },
          { label: "Events", value: 64000 },
          { label: "Content", value: 26000 },
          { label: "Email", value: 15000 },
        ],
      }),
      ...table({
        x: 0,
        y: ROW2_Y,
        w: W,
        h: ROW2_H,
        title: "Campaign performance",
        columns: [
          { label: "Campaign", width: 320 },
          { label: "Channel", width: 160 },
          { label: "Spend", width: 140 },
          { label: "Leads", width: 140 },
          { label: "CPL", width: 140 },
          { label: "Pipeline", width: 160 },
        ],
        rows: [
          ["Autumn launch", "Search", "$58k", "1,640", "$35", "$1.2M"],
          ["Partner webinar", "Events", "$22k", "610", "$36", "$640k"],
          ["Founder stories", "Social", "$31k", "920", "$34", "$410k"],
          ["Retargeting Q3", "Social", "$27k", "540", "$50", "$290k"],
          ["Industry report", "Content", "$12k", "480", "$25", "$260k"],
        ],
      }),
    ],
  },
  {
    id: "service-health",
    name: "Service health (SRE)",
    description: "Latency percentiles, error budget, service status",
    build: () => [
      ...header(0, 0, W, "Service health", "Last 24 hours · production"),
      ...kpiRow([
        ["Availability", "99.95%", "▲ within 99.9% SLO", "good"],
        ["Error budget left", "38%", "▼ 21 pts this week", "warning"],
        ["p95 latency", "412 ms", "▲ 64 ms vs yesterday", "serious"],
        ["Open incidents", "2", "1 SEV-2 active", "critical"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "API latency (ms)",
        xLabels: [
          "00",
          "02",
          "04",
          "06",
          "08",
          "10",
          "12",
          "14",
          "16",
          "18",
          "20",
          "22",
        ],
        series: [
          {
            name: "p50",
            values: [88, 85, 82, 84, 96, 110, 118, 121, 115, 108, 99, 92],
          },
          {
            name: "p95",
            values: [
              260, 250, 240, 255, 320, 380, 412, 430, 398, 360, 310, 280,
            ],
          },
          {
            name: "p99",
            values: [
              520, 510, 490, 530, 640, 720, 810, 860, 790, 700, 610, 560,
            ],
          },
        ],
      }),
      ...statusList({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Services",
        items: [
          {
            name: "API gateway",
            status: "good",
            word: "Operational",
            metric: "99.99%",
          },
          {
            name: "Auth",
            status: "good",
            word: "Operational",
            metric: "99.98%",
          },
          {
            name: "Payments",
            status: "critical",
            word: "Outage",
            metric: "97.2%",
          },
          {
            name: "Search",
            status: "serious",
            word: "Degraded",
            metric: "99.1%",
          },
          {
            name: "Notifications",
            status: "warning",
            word: "Delayed",
            metric: "99.6%",
          },
          {
            name: "Storage",
            status: "good",
            word: "Operational",
            metric: "100%",
          },
        ],
      }),
      ...barChart({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Errors per hour",
        xLabels: [
          "00",
          "02",
          "04",
          "06",
          "08",
          "10",
          "12",
          "14",
          "16",
          "18",
          "20",
          "22",
        ],
        stacked: true,
        series: [
          {
            name: "5xx",
            values: [12, 9, 8, 10, 22, 35, 61, 74, 40, 28, 18, 14],
          },
          {
            name: "Timeouts",
            values: [4, 3, 3, 4, 9, 14, 26, 31, 17, 11, 7, 5],
          },
        ],
      }),
      ...table({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Recent incidents",
        columns: [
          { label: "ID", width: 80 },
          { label: "Summary", width: 250 },
          { label: "Sev", width: 60 },
          { label: "Status", width: 110 },
        ],
        rows: [
          ["INC-482", "Payments provider timeouts", "2", "Investigating"],
          ["INC-481", "Search index lag", "3", "Monitoring"],
          ["INC-479", "Email queue backlog", "4", "Resolved"],
          ["INC-476", "Auth token refresh errors", "3", "Resolved"],
        ],
      }),
    ],
  },
  {
    id: "support",
    name: "Customer support",
    description: "Ticket volume, resolution time, CSAT, channel mix",
    build: () => [
      ...header(0, 0, W, "Customer support", "Last 12 weeks · all queues"),
      ...kpiRow([
        ["Open tickets", "318", "▼ 44 vs last week", "good"],
        ["First response", "1h 12m", "▲ 18m, slower", "serious"],
        ["Resolution time", "9.4h", "▼ 1.1h vs last week", "good"],
        ["CSAT", "91%", "▲ 2 pts vs last week", "good"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Tickets per week",
        xLabels: WEEKS,
        series: [
          {
            name: "Opened",
            values: [
              640, 610, 700, 720, 690, 760, 800, 780, 740, 710, 690, 660,
            ],
          },
          {
            name: "Resolved",
            values: [
              600, 620, 650, 700, 710, 720, 760, 790, 770, 740, 720, 700,
            ],
          },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Tickets by channel",
        rows: [
          { label: "Email", value: 3120 },
          { label: "Chat", value: 2840 },
          { label: "In-app", value: 1290 },
          { label: "Phone", value: 610 },
          { label: "Social", value: 220 },
        ],
      }),
      ...rankBars({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Top contact reasons",
        rows: [
          { label: "Billing", value: 1480 },
          { label: "Login issues", value: 1210 },
          { label: "Integrations", value: 940 },
          { label: "Bug report", value: 820 },
          { label: "How-to", value: 760 },
        ],
      }),
      ...table({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Agent leaderboard",
        columns: [
          { label: "Agent", width: 160 },
          { label: "Solved", width: 100 },
          { label: "CSAT", width: 90 },
          { label: "Avg. handle", width: 120 },
        ],
        rows: [
          ["R. Silva", "412", "96%", "11m"],
          ["K. Tanaka", "388", "94%", "13m"],
          ["P. Moreau", "351", "92%", "12m"],
          ["D. Mensah", "330", "93%", "15m"],
          ["E. Johansson", "298", "90%", "14m"],
        ],
      }),
    ],
  },
  {
    id: "finance",
    name: "Finance overview",
    description: "Revenue vs costs, cash runway, spend by department",
    build: () => [
      ...header(0, 0, W, "Finance overview", "Fiscal year to date"),
      ...kpiRow([
        ["Revenue YTD", "$18.4M", "▲ 24% year over year", "good"],
        ["Gross margin", "71%", "▲ 1.5 pts year over year", "good"],
        ["Monthly burn", "$620k", "▲ $40k vs plan", "serious"],
        ["Runway", "26 months", "Above 18-month floor", "good"],
      ]),
      ...barChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Revenue and operating costs",
        unit: "$",
        xLabels: MONTHS.slice(0, 9),
        series: [
          {
            name: "Revenue",
            values: [1.8, 1.9, 2.0, 1.9, 2.1, 2.2, 2.0, 2.2, 2.3].map(
              (v) => v * 1_000_000,
            ),
          },
          {
            name: "Operating costs",
            values: [2.3, 2.4, 2.5, 2.4, 2.6, 2.7, 2.6, 2.8, 2.9].map(
              (v) => v * 1_000_000,
            ),
          },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Spend by department (YTD)",
        unit: "$",
        rows: [
          { label: "Engineering", value: 9_200_000 },
          { label: "Sales", value: 5_100_000 },
          { label: "Marketing", value: 3_400_000 },
          { label: "G&A", value: 2_300_000 },
          { label: "Support", value: 1_400_000 },
        ],
      }),
      ...lineChart({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Cash balance",
        unit: "$",
        xLabels: MONTHS.slice(0, 9),
        series: [
          {
            name: "Cash",
            values: [21.4, 20.9, 20.3, 19.8, 19.2, 18.7, 18.1, 17.5, 16.9].map(
              (v) => v * 1_000_000,
            ),
          },
        ],
      }),
      ...table({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Budget vs actual (Q3)",
        columns: [
          { label: "Line", width: 170 },
          { label: "Budget", width: 110 },
          { label: "Actual", width: 110 },
          { label: "Variance", width: 100 },
        ],
        rows: [
          ["Payroll", "$4.10M", "$4.02M", "−2%"],
          ["Cloud", "$0.62M", "$0.71M", "+15%"],
          ["Marketing", "$0.95M", "$0.88M", "−7%"],
          ["Travel", "$0.18M", "$0.21M", "+17%"],
          ["Software", "$0.24M", "$0.23M", "−4%"],
        ],
      }),
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Orders and revenue, basket funnel, top products",
    build: () => [
      ...header(0, 0, W, "E-commerce", "Last 12 weeks · all storefronts"),
      ...kpiRow([
        ["Revenue", "$2.36M", "▲ 11% vs prior period", "good"],
        ["Orders", "31,480", "▲ 8% vs prior period", "good"],
        ["Avg. order value", "$75", "▲ $2 vs prior period", "good"],
        ["Return rate", "7.8%", "▲ 1.1 pts vs prior period", "serious"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Weekly orders by storefront",
        xLabels: WEEKS,
        series: [
          {
            name: "Web",
            values: [
              1500, 1560, 1610, 1580, 1690, 1720, 1800, 1760, 1850, 1900, 1980,
              2100,
            ],
          },
          {
            name: "App",
            values: [
              720, 760, 800, 830, 860, 900, 950, 990, 1020, 1080, 1120, 1190,
            ],
          },
          {
            name: "Marketplace",
            values: [
              310, 300, 320, 340, 330, 360, 350, 370, 390, 380, 400, 420,
            ],
          },
        ],
      }),
      ...funnel({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Checkout funnel",
        stages: [
          { label: "Cart", value: 96000 },
          { label: "Shipping", value: 58000 },
          { label: "Payment", value: 41000 },
          { label: "Order placed", value: 31480 },
        ],
      }),
      ...rankBars({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Top products by revenue",
        unit: "$",
        rows: [
          { label: "Trail runner", value: 312000 },
          { label: "Rain shell", value: 268000 },
          { label: "Merino tee", value: 191000 },
          { label: "Day pack", value: 164000 },
          { label: "Water bottle", value: 72000 },
        ],
      }),
      ...barChart({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Orders by customer type",
        xLabels: DAYS,
        stacked: true,
        series: [
          {
            name: "Returning",
            values: [2800, 2900, 2850, 3000, 3300, 3900, 3600],
          },
          { name: "New", values: [1200, 1150, 1250, 1300, 1500, 2100, 1900] },
        ],
      }),
    ],
  },
  {
    id: "product-engagement",
    name: "Product engagement",
    description: "Active users, feature adoption, weekly retention",
    build: () => [
      ...header(0, 0, W, "Product engagement", "Last 12 weeks · all platforms"),
      ...kpiRow([
        ["Weekly active users", "84.2k", "▲ 5.3% vs last week", "good"],
        ["DAU / MAU", "38%", "▲ 1 pt vs last month", "good"],
        ["Avg. sessions / user", "4.7", "No change", "warning"],
        ["Week-4 retention", "46%", "▼ 3 pts vs prior cohort", "serious"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Active users",
        xLabels: WEEKS,
        series: [
          {
            name: "Monthly",
            values: [
              182, 186, 190, 195, 199, 204, 210, 214, 219, 223, 228, 232,
            ].map((v) => v * 1000),
          },
          {
            name: "Weekly",
            values: [68, 70, 71, 73, 74, 76, 77, 79, 80, 81, 82, 84].map(
              (v) => v * 1000,
            ),
          },
          {
            name: "Daily",
            values: [26, 27, 27, 28, 29, 29, 30, 31, 31, 32, 32, 33].map(
              (v) => v * 1000,
            ),
          },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Feature adoption (% of WAU)",
        rows: [
          { label: "Dashboards", value: 72 },
          { label: "Sharing", value: 58 },
          { label: "Comments", value: 41 },
          { label: "Automations", value: 23 },
          { label: "API", value: 9 },
        ],
      }),
      ...heatmap({
        x: 0,
        y: ROW2_Y,
        w: W,
        h: ROW2_H,
        title: "Weekly retention by signup cohort",
        rows: ["W5", "W6", "W7", "W8", "W9"],
        cols: ["Wk 0", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6"],
        values: [
          [100, 64, 55, 50, 47, 45, 44],
          [100, 66, 57, 52, 48, 46, null],
          [100, 61, 53, 49, 46, null, null],
          [100, 63, 54, 50, null, null, null],
          [100, 60, 52, null, null, null, null],
        ],
      }),
    ],
  },
  {
    id: "project-delivery",
    name: "Project delivery",
    description: "Sprint burndown, work by status, milestones",
    build: () => [
      ...header(0, 0, W, "Project delivery", "Sprint 14 · Platform team"),
      ...kpiRow([
        ["Completed", "58 pts", "72% of committed", "warning"],
        ["Velocity", "64 pts", "▲ 6 pts, 3-sprint average", "good"],
        ["Blocked items", "4", "▲ 2 since last standup", "serious"],
        ["Next milestone", "Oct 30", "On track", "good"],
      ]),
      ...lineChart({
        x: 0,
        y: ROW1_Y,
        w: WIDE,
        h: ROW1_H,
        title: "Sprint burndown (story points)",
        xLabels: ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10"],
        series: [
          { name: "Planned", values: [80, 72, 64, 56, 48, 40, 32, 24, 16, 8] },
          { name: "Actual", values: [80, 78, 70, 66, 57, 52, 44, 38, 30, 22] },
        ],
      }),
      ...rankBars({
        x: WIDE + GAP,
        y: ROW1_Y,
        w: NARROW,
        h: ROW1_H,
        title: "Work items by status",
        rows: [
          { label: "Done", value: 31 },
          { label: "In review", value: 9 },
          { label: "In progress", value: 12 },
          { label: "To do", value: 14 },
          { label: "Blocked", value: 4 },
        ],
      }),
      ...barChart({
        x: 0,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Committed vs completed per sprint",
        xLabels: ["S9", "S10", "S11", "S12", "S13", "S14"],
        series: [
          { name: "Committed", values: [70, 72, 75, 78, 80, 80] },
          { name: "Completed", values: [58, 66, 61, 70, 74, 58] },
        ],
      }),
      ...table({
        x: HALF + GAP,
        y: ROW2_Y,
        w: HALF,
        h: ROW2_H,
        title: "Milestones",
        columns: [
          { label: "Milestone", width: 220 },
          { label: "Owner", width: 110 },
          { label: "Due", width: 90 },
          { label: "Status", width: 110 },
        ],
        rows: [
          ["Auth migration", "Platform", "Oct 30", "On track"],
          ["Billing v2 beta", "Payments", "Nov 14", "At risk"],
          ["Mobile offline mode", "Mobile", "Nov 28", "On track"],
          ["SOC 2 audit", "Security", "Dec 09", "Not started"],
        ],
      }),
    ],
  },
];

export const getDashboardTemplate = (id: string) =>
  DASHBOARD_TEMPLATES.find((t) => t.id === id);

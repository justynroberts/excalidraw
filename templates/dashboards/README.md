# Dashboard templates

Ten general-purpose dashboards, drawn as native Excalidraw elements. Open any `.excalidraw` file in Excalidraw (or drag it onto the canvas) and edit it like any other drawing. Each file has a matching `.png` preview.

In this fork you can also insert them from the **Claude** panel (Dashboards), or ask Claude or an MCP client for one (`insert_dashboard_template`).

| File | Contents |
| --- | --- |
| `saas-metrics` | MRR by component, MRR by plan, cohort retention heatmap, top expansions |
| `web-analytics` | Sessions by channel, conversion funnel, top pages, sessions by device |
| `sales-pipeline` | Bookings vs target, deals by stage, rep leaderboard, closing this month |
| `marketing` | Leads by source, spend by channel, campaign performance table |
| `service-health` | p50/p95/p99 latency, service status, errors per hour, incidents |
| `support` | Opened vs resolved tickets, channel mix, contact reasons, agent leaderboard |
| `finance` | Revenue vs operating costs, spend by department, cash balance, budget vs actual |
| `ecommerce` | Orders by storefront, checkout funnel, top products, new vs returning |
| `product-engagement` | DAU/WAU/MAU, feature adoption, weekly retention heatmap |
| `project-delivery` | Sprint burndown, work by status, committed vs completed, milestones |

Every chart with two or more series has a legend and a direct label at each series end. Charts carry at most three series, in a colour-vision-safe order. Status colours appear only on KPI deltas and service status, always with ▲/▼ or a word. All numbers are placeholder data.

The source is `excalidraw-app/ai/templates/`. To regenerate these files after changing a template, insert each one in the app and save it (`Menu → Save to...`).

MIT License. Part of this Excalidraw fork (see `NOTICE.md`).

# Gazer UI Redesign v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin Gazer toward a Vercel-dashboard aesthetic: bundled Inter + JetBrains Mono fonts, a left sidebar nav, flatter/whitespace-driven panels, bigger type scale, far more legible logs, and bigger draggable incident graph nodes.

**Architecture:** Builds on the already-implemented round 1 changes (CPU/memory removal, errors/warnings KPI, layered auto-layout graph). This round touches `package.json` (two new font deps), `src/renderer/main.tsx` (font imports), `src/renderer/App.tsx` (sidebar layout, log markup, draggable graph nodes rendered as HTML cards over an SVG edge layer), and `src/renderer/styles.css` (tokens, sidebar, logs, graph card/drag styles).

**Tech Stack:** React 18 + TypeScript, Electron, Vite, `@fontsource/inter`, `@fontsource/jetbrains-mono`. No test runner configured — verification is `npm run typecheck` plus manual checks via `npm run dev`.

---

## Task 1: Bundle Inter + JetBrains Mono fonts

**Files:**
- Modify: `package.json`
- Modify: `src/renderer/main.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Install font packages**

Run: `npm install @fontsource/inter@5.2.8 @fontsource/jetbrains-mono@5.2.8`
Expected: both added to `dependencies` in `package.json`.

- [ ] **Step 2: Import font weights in the renderer entry point**

In `src/renderer/main.tsx`, change:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
```

to:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import { App } from "./App";
import "./styles.css";
```

- [ ] **Step 3: Update font tokens in `styles.css`**

In `src/renderer/styles.css`, change the `:root` block's font declarations:

```css
:root {
  color-scheme: light;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #111111;
  background: #fafafa;
  --bg: #fafafa;
  --surface: #ffffff;
  --surface-soft: #f6f6f6;
  --surface-raised: #ffffff;
  --border: #e5e5e5;
  --border-strong: #cfcfcf;
  --text: #111111;
  --text-muted: #666666;
  --text-soft: #3f3f46;
  --success: #007a3d;
  --warning: #9a5b00;
  --danger: #d92d20;
  --info: #0369a1;
  --accent: #000000;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 12px 28px rgba(0, 0, 0, 0.04);
}
```

to:

```css
:root {
  color-scheme: light;
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 16px;
  line-height: 1.5;
  color: #111111;
  background: #fafafa;
  --bg: #fafafa;
  --surface: #ffffff;
  --surface-soft: #f6f6f6;
  --surface-raised: #ffffff;
  --border: #e5e5e5;
  --border-strong: #cfcfcf;
  --text: #111111;
  --text-muted: #666666;
  --text-soft: #3f3f46;
  --success: #007a3d;
  --warning: #9a5b00;
  --danger: #d92d20;
  --info: #0369a1;
  --accent: #000000;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 12px 28px rgba(0, 0, 0, 0.04);
}
```

- [ ] **Step 4: Replace the two hardcoded monospace font-family declarations to use the token**

In `src/renderer/styles.css`, change:

```css
.last-action strong {
  grid-column: 2;
  color: var(--text);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
}
```

to:

```css
.last-action strong {
  grid-column: 2;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 13px;
}
```

And change:

```css
.log-line {
  display: grid;
  grid-template-columns: 86px 58px minmax(0, 1fr);
  gap: 10px;
  min-height: 28px;
  align-items: center;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--surface-soft);
  color: var(--text-soft);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}
```

to:

```css
.log-line {
  display: grid;
  grid-template-columns: 96px 70px minmax(0, 1fr);
  gap: 10px;
  min-height: 36px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  border-left: 3px solid var(--border);
  background: var(--surface-soft);
  color: var(--text-soft);
  font-family: var(--font-mono);
  font-size: 13px;
}
```

(The grid/sizing/border-left changes here also satisfy Task 3's log readability work — both edits land in this same rule so it's done once.)

- [ ] **Step 5: Verify**

Run: `npm run typecheck`
Expected: PASS (no TS changes yet, this confirms nothing broke).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/renderer/main.tsx src/renderer/styles.css
git commit -m "feat: bundle Inter and JetBrains Mono fonts, add font-mono token"
```

(Skip commit if this directory is not a git repository — confirm with `git rev-parse --is-inside-work-tree` first; if it fails, skip Step 6 for every remaining task in this plan too.)

---

## Task 2: Left sidebar navigation

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Restructure the `App()` return JSX**

In `src/renderer/App.tsx`, change the final return block:

```tsx
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            <strong>Gazer</strong>
            <span>Operations Console</span>
          </div>
        </div>

        <nav className="app-tabs" aria-label="Primary views">
          <button className={activeTab === "overview" ? "active" : ""} type="button" onClick={() => setActiveTab("overview")}>
            Overview
          </button>
          <button className={activeTab === "incident" ? "active" : ""} type="button" onClick={() => setActiveTab("incident")}>
            Incident Map
          </button>
        </nav>

        <div className="topbar-actions">
          <span className={`deploy-window ${env.deployWindow === "open" ? "success" : "warning"}`}>
            <Clock3 size={15} aria-hidden="true" />
            Deploy {env.deployWindow}
          </span>
          <span className="traffic-chip">
            <SquareActivity size={15} aria-hidden="true" />
            {env.traffic}
          </span>
        </div>
      </header>

      <section className="workspace">
        {activeTab === "overview" ? (
          <OverviewTab
            env={env}
            envs={envs}
            envIndex={envIndex}
            service={service}
            serviceIndex={serviceIndex}
            query={query}
            lastAction={lastAction}
            kpis={kpis}
            onEnvChange={setEnvIndex}
            onServiceChange={setServiceIndex}
            onQuery={setQuery}
            onAction={runAction}
          />
        ) : (
          <IncidentTab />
        )}
      </section>
    </main>
  );
}
```

to:

```tsx
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <img src="./icon.svg" alt="" />
          <div>
            <strong>Gazer</strong>
            <span>Operations Console</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary views">
          <button className={activeTab === "overview" ? "active" : ""} type="button" onClick={() => setActiveTab("overview")}>
            <SquareActivity size={17} aria-hidden="true" />
            <span>Overview</span>
          </button>
          <button className={activeTab === "incident" ? "active" : ""} type="button" onClick={() => setActiveTab("incident")}>
            <AlertTriangle size={17} aria-hidden="true" />
            <span>Incident Map</span>
          </button>
        </nav>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="topbar-actions">
            <span className={`deploy-window ${env.deployWindow === "open" ? "success" : "warning"}`}>
              <Clock3 size={15} aria-hidden="true" />
              Deploy {env.deployWindow}
            </span>
            <span className="traffic-chip">
              <SquareActivity size={15} aria-hidden="true" />
              {env.traffic}
            </span>
          </div>
        </header>

        <section className="workspace">
          {activeTab === "overview" ? (
            <OverviewTab
              env={env}
              envs={envs}
              envIndex={envIndex}
              service={service}
              serviceIndex={serviceIndex}
              query={query}
              lastAction={lastAction}
              kpis={kpis}
              onEnvChange={setEnvIndex}
              onServiceChange={setServiceIndex}
              onQuery={setQuery}
              onAction={runAction}
            />
          ) : (
            <IncidentTab />
          )}
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Replace `.app-shell`/`.app-header`/`.brand`/`.app-tabs` CSS with sidebar layout**

In `src/renderer/styles.css`, change:

```css
.app-shell {
  display: grid;
  grid-template-rows: 64px minmax(0, 1fr);
  height: 100vh;
  color: var(--text);
}

.app-header {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  -webkit-app-region: drag;
}

.brand {
  display: flex;
  align-items: center;
  min-height: 44px;
  gap: 10px;
}

.brand img {
  width: 32px;
  height: 32px;
}

.brand strong,
.app-tabs button,
.panel-heading h2,
.detail-header h2,
.incident-summary h1 {
  letter-spacing: 0;
}

.brand strong {
  display: block;
  font-size: 16px;
  line-height: 1.1;
}

.brand span,
.environment-meta,
.panel-heading p,
.detail-header p,
.kpi-card span,
.kpi-card small,
.detail-grid span,
.slo-block span,
.incident-summary p,
.incident-summary span,
.incident-graph-toolbar p,
.incident-graph-toolbar span,
.incident-metrics span {
  color: var(--text-muted);
}

.app-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  justify-self: center;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft);
  -webkit-app-region: no-drag;
}

.app-tabs button {
  min-width: 108px;
  min-height: 32px;
  padding: 0 14px;
  color: var(--text-muted);
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 14px;
  font-weight: 650;
}

.app-tabs button.active {
  color: var(--text);
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.workspace {
  min-width: 0;
  min-height: 0;
  padding: 20px;
  overflow: hidden;
}
```

to:

```css
.app-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100vh;
  color: var(--text);
}

.app-sidebar {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 20px 16px;
  border-right: 1px solid var(--border);
  background: var(--surface);
  -webkit-app-region: drag;
}

.brand {
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 10px;
  -webkit-app-region: drag;
}

.brand img {
  width: 30px;
  height: 30px;
}

.brand strong,
.sidebar-nav button,
.panel-heading h2,
.detail-header h2,
.incident-summary h1 {
  letter-spacing: 0;
}

.brand strong {
  display: block;
  font-size: 16px;
  line-height: 1.1;
}

.brand span,
.environment-meta,
.panel-heading p,
.detail-header p,
.kpi-card span,
.kpi-card small,
.detail-grid span,
.slo-block span,
.incident-summary p,
.incident-summary span,
.incident-graph-toolbar p,
.incident-graph-toolbar span,
.incident-metrics span {
  color: var(--text-muted);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  color: var(--text-muted);
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  transition: background 160ms ease, color 160ms ease;
}

.sidebar-nav button:hover {
  color: var(--text);
  background: var(--surface-soft);
}

.sidebar-nav button.active {
  color: var(--text);
  background: var(--surface-soft);
}

.app-content {
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.app-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
}

.workspace {
  min-width: 0;
  min-height: 0;
  padding: 28px;
  overflow: hidden;
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/styles.css
git commit -m "feat: replace top tab bar with left sidebar navigation"
```

---

## Task 3: Flatter panel tokens and bigger type scale

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Reduce border+shadow stacking on top-level panels**

Change:

```css
.kpi-card,
.panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
```

to:

```css
.kpi-card,
.panel {
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
```

(Top-level cards now rely on shadow alone for separation, no border — flatter, more whitespace-driven.)

- [ ] **Step 2: Increase KPI number and heading sizes**

Change:

```css
.kpi-card strong {
  display: block;
  margin: 1px 0;
  font-size: 25px;
  line-height: 1.1;
}
```

to:

```css
.kpi-card strong {
  display: block;
  margin: 1px 0;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
}
```

Change:

```css
.panel-heading h2,
.detail-header h2 {
  margin: 0;
  font-size: 18px;
}
```

to:

```css
.panel-heading h2,
.detail-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
}
```

Change:

```css
.incident-summary h1 {
  margin: 0 0 4px;
  font-size: 28px;
  line-height: 1.1;
}
```

to:

```css
.incident-summary h1 {
  margin: 0 0 4px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
}
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Expected: panels read flatter (shadow only, no visible border), KPI numbers and headings noticeably larger.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/styles.css
git commit -m "style: flatten panel borders and increase heading/KPI type scale"
```

---

## Task 4: Bigger card-style incident graph nodes (static sizing first)

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

This task increases node size and switches node rendering from SVG `<g>`/`<rect>`/`<text>` to absolutely-positioned HTML `<div>` cards layered over the SVG edge drawing — this is the foundation Task 5 (dragging) builds on, since dragging plain HTML elements is far simpler than dragging SVG shapes.

- [ ] **Step 1: Increase graph sizing constants**

In `src/renderer/App.tsx`, change:

```ts
const GRAPH_COLUMN_WIDTH = 230;
const GRAPH_NODE_WIDTH = 150;
const GRAPH_NODE_HEIGHT = 64;
const GRAPH_ROW_HEIGHT = 92;
const GRAPH_TOP_MARGIN = 40;
```

to:

```ts
const GRAPH_COLUMN_WIDTH = 280;
const GRAPH_NODE_WIDTH = 220;
const GRAPH_NODE_HEIGHT = 100;
const GRAPH_ROW_HEIGHT = 140;
const GRAPH_TOP_MARGIN = 40;
const GRAPH_CANVAS_WIDTH = 1180;
const GRAPH_CANVAS_HEIGHT = 760;
```

- [ ] **Step 2: Update the layering function's centering math to use the new canvas height**

In `computeLayeredPositions`, change:

```ts
  const positionById = new Map<string, { x: number; y: number }>();
  for (const [layerIndex, ids] of byLayer.entries()) {
    const totalHeight = ids.length * GRAPH_ROW_HEIGHT;
    const startY = GRAPH_TOP_MARGIN + Math.max(0, (560 - totalHeight) / 2);
```

to:

```ts
  const positionById = new Map<string, { x: number; y: number }>();
  for (const [layerIndex, ids] of byLayer.entries()) {
    const totalHeight = ids.length * GRAPH_ROW_HEIGHT;
    const startY = GRAPH_TOP_MARGIN + Math.max(0, (GRAPH_CANVAS_HEIGHT - GRAPH_TOP_MARGIN * 2 - totalHeight) / 2);
```

- [ ] **Step 3: Replace the SVG node rendering with HTML card overlays**

In `IncidentGraph`, change the whole `<svg>...</svg>` plus the JSX immediately around it. Current code:

```tsx
      <svg className="incident-graph" viewBox="0 0 940 650" role="img" aria-label="Service dependency impact graph">
        <defs>
          <marker id="incident-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
          </marker>
        </defs>
        <g>
          {incidentEdges.map(([from, to]) => {
            const active = from === selected || to === selected;
            const incidentEdge =
              ["checkout", "billing", "events"].includes(from) && ["orders", "billing", "events", "notify"].includes(to);
            const fromNode = nodesById.get(from);
            const toNode = nodesById.get(to);
            const dimmed =
              severityFilter !== "all" &&
              fromNode &&
              toNode &&
              !matchesFilter(fromNode.status) &&
              !matchesFilter(toNode.status);
            const edgeClass = [
              "incident-edge",
              active ? "active" : "",
              active ? "flowing" : "",
              mode === "errors" && incidentEdge ? "error" : "",
              mode === "recovery" && to === "events" ? "recovery" : "",
              dimmed ? "dimmed" : ""
            ]
              .filter(Boolean)
              .join(" ");
            return <path className={edgeClass} d={edgePath(nodesById, from, to)} markerEnd="url(#incident-arrow)" key={`${from}-${to}`} />;
          })}
        </g>
        <g>
          {nodes.map((node) => {
            const isSelected = node.id === selected;
            const isRelated = relation.all.has(node.id);
            const passesFilter = matchesFilter(node.status);
            const opacity = !passesFilter ? 0.22 : isRelated ? 1 : 0.38;
            return (
              <g
                className={`incident-node ${node.status} ${isSelected ? "selected" : ""}`}
                key={node.id}
                opacity={opacity}
                role="button"
                tabIndex={0}
                aria-label={`Select ${node.name}`}
                onClick={() => onSelected(node.id)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelected(node.id);
                  }
                }}
              >
                <rect x={node.x} y={node.y} width={node.w} height={node.h} rx="8" />
                <text x={node.x + 14} y={node.y + 26}>{node.name}</text>
                <text className="incident-node-sub" x={node.x + 14} y={node.y + 45}>
                  {node.owner} / {node.errors}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
```

Replace with:

```tsx
      <div className="incident-graph-canvas" style={{ width: GRAPH_CANVAS_WIDTH, height: GRAPH_CANVAS_HEIGHT }}>
        <svg
          className="incident-graph"
          width={GRAPH_CANVAS_WIDTH}
          height={GRAPH_CANVAS_HEIGHT}
          viewBox={`0 0 ${GRAPH_CANVAS_WIDTH} ${GRAPH_CANVAS_HEIGHT}`}
          role="img"
          aria-label="Service dependency impact graph"
        >
          <defs>
            <marker id="incident-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
            </marker>
          </defs>
          <g>
            {incidentEdges.map(([from, to]) => {
              const active = from === selected || to === selected;
              const incidentEdge =
                ["checkout", "billing", "events"].includes(from) && ["orders", "billing", "events", "notify"].includes(to);
              const fromNode = nodesById.get(from);
              const toNode = nodesById.get(to);
              const dimmed =
                severityFilter !== "all" &&
                fromNode &&
                toNode &&
                !matchesFilter(fromNode.status) &&
                !matchesFilter(toNode.status);
              const edgeClass = [
                "incident-edge",
                active ? "active" : "",
                active ? "flowing" : "",
                mode === "errors" && incidentEdge ? "error" : "",
                mode === "recovery" && to === "events" ? "recovery" : "",
                dimmed ? "dimmed" : ""
              ]
                .filter(Boolean)
                .join(" ");
              return <path className={edgeClass} d={edgePath(nodesById, from, to)} markerEnd="url(#incident-arrow)" key={`${from}-${to}`} />;
            })}
          </g>
        </svg>

        {nodes.map((node) => {
          const isSelected = node.id === selected;
          const isRelated = relation.all.has(node.id);
          const passesFilter = matchesFilter(node.status);
          const opacity = !passesFilter ? 0.22 : isRelated ? 1 : 0.38;
          return (
            <div
              className={`incident-node-card ${node.status} ${isSelected ? "selected" : ""}`}
              key={node.id}
              style={{ left: node.x, top: node.y, width: node.w, height: node.h, opacity }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${node.name}`}
              onClick={() => onSelected(node.id)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelected(node.id);
                }
              }}
            >
              <div className="incident-node-card-head">
                <strong>{node.name}</strong>
                <span className={`status-pill ${node.status === "failing" ? "danger" : node.status === "affected" ? "warning" : "success"}`}>
                  {node.status}
                </span>
              </div>
              <div className="incident-node-card-grid">
                <span>Latency</span>
                <strong>{node.latency}</strong>
                <span>Errors</span>
                <strong>{node.errors}</strong>
              </div>
            </div>
          );
        })}
      </div>
```

- [ ] **Step 4: Update `IncidentDetail`'s `node.kind`-based `ServiceIcon` usage — unaffected, confirm no change needed**

`IncidentDetail` still references `node.kind` via `ServiceIcon`, which is unchanged. No edit needed here, just confirming via read that `IncidentDetail` doesn't reference the now-removed SVG node markup (it doesn't — it only reads `node` fields, which are unchanged on `PositionedIncidentNode`).

- [ ] **Step 5: Replace `.incident-graph`/`.incident-node*` CSS with canvas + card styles**

In `src/renderer/styles.css`, change:

```css
.incident-graph {
  width: 100%;
  height: 100%;
  min-height: 590px;
}
```

to:

```css
.incident-graph-canvas {
  position: relative;
}

.incident-graph {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}
```

Then change:

```css
.incident-node {
  cursor: pointer;
}

.incident-node rect {
  fill: var(--surface);
  stroke: var(--border);
  stroke-width: 1.3;
}

.incident-node text {
  fill: var(--text);
  font-size: 13px;
  font-weight: 760;
  pointer-events: none;
}

.incident-node .incident-node-sub {
  fill: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.incident-node.selected rect {
  stroke: var(--text);
  stroke-width: 2.5;
}

.incident-node.affected rect {
  stroke: rgba(154, 91, 0, 0.5);
  fill: #fff8ec;
}

.incident-node.failing rect {
  stroke: rgba(217, 45, 32, 0.58);
  fill: #fff5f4;
}
```

to:

```css
.incident-node-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  cursor: pointer;
  user-select: none;
  background: var(--surface);
  border: 1.3px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.incident-node-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.incident-node-card-head strong {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.incident-node-card-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 8px;
  font-size: 11px;
  color: var(--text-muted);
}

.incident-node-card-grid strong {
  justify-self: end;
  color: var(--text-soft);
  font-variant-numeric: tabular-nums;
}

.incident-node-card.selected {
  border-color: var(--text);
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08), var(--shadow);
}

.incident-node-card.affected {
  border-color: rgba(154, 91, 0, 0.5);
  background: #fff8ec;
}

.incident-node-card.failing {
  border-color: rgba(217, 45, 32, 0.58);
  background: #fff5f4;
}
```

- [ ] **Step 6: Make the graph panel scrollable since the canvas is now larger than the panel**

Change:

```css
.incident-graph-panel {
  position: relative;
  min-height: 0;
  padding: 0;
}
```

to:

```css
.incident-graph-panel {
  position: relative;
  min-height: 0;
  padding: 0;
  overflow: auto;
}
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/App.tsx src/renderer/styles.css
git commit -m "feat: render incident graph nodes as larger HTML cards over SVG edges"
```

---

## Task 5: Draggable incident graph nodes

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add drag offset state to `IncidentTab` and pass it down**

In `src/renderer/App.tsx`, change `IncidentTab`:

```tsx
function IncidentTab() {
  const [selected, setSelected] = useState("checkout");
  const [mode, setMode] = useState<IncidentMode>("impact");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const positionedNodes = useMemo(() => computeLayeredPositions(incidentNodes, incidentEdges), []);
  const selectedNode = positionedNodes.find((node) => node.id === selected) ?? positionedNodes[0];

  return (
    <section className="incident-layout">
      <header className="incident-summary panel">
        <div>
          <p>Incident War Room</p>
          <h1>Checkout degradation impact map</h1>
          <span>Map process dependencies, isolate blast radius, and inspect logs from the affected path.</span>
        </div>
        <div className="incident-summary-stats">
          <span className="status-pill danger">SEV-1 active</span>
          <span className="status-pill warning">12.4k rpm at risk</span>
          <span className="status-pill success">3 responders</span>
        </div>
      </header>
      <div className="incident-grid">
        <IncidentTimeline />
        <IncidentGraph
          nodes={positionedNodes}
          selected={selected}
          mode={mode}
          severityFilter={severityFilter}
          onSelected={setSelected}
          onMode={setMode}
          onSeverityFilter={setSeverityFilter}
        />
        <IncidentDetail node={selectedNode} />
      </div>
    </section>
  );
}
```

to:

```tsx
function IncidentTab() {
  const [selected, setSelected] = useState("checkout");
  const [mode, setMode] = useState<IncidentMode>("impact");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [dragOffsets, setDragOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  const basePositions = useMemo(() => computeLayeredPositions(incidentNodes, incidentEdges), []);
  const positionedNodes = useMemo(
    () =>
      basePositions.map((node) => {
        const offset = dragOffsets[node.id];
        return offset ? { ...node, x: node.x + offset.dx, y: node.y + offset.dy } : node;
      }),
    [basePositions, dragOffsets]
  );
  const selectedNode = positionedNodes.find((node) => node.id === selected) ?? positionedNodes[0];

  function handleDrag(id: string, dx: number, dy: number) {
    setDragOffsets((current) => ({ ...current, [id]: { dx, dy } }));
  }

  return (
    <section className="incident-layout">
      <header className="incident-summary panel">
        <div>
          <p>Incident War Room</p>
          <h1>Checkout degradation impact map</h1>
          <span>Map process dependencies, isolate blast radius, and inspect logs from the affected path.</span>
        </div>
        <div className="incident-summary-stats">
          <span className="status-pill danger">SEV-1 active</span>
          <span className="status-pill warning">12.4k rpm at risk</span>
          <span className="status-pill success">3 responders</span>
        </div>
      </header>
      <div className="incident-grid">
        <IncidentTimeline />
        <IncidentGraph
          nodes={positionedNodes}
          selected={selected}
          mode={mode}
          severityFilter={severityFilter}
          onSelected={setSelected}
          onMode={setMode}
          onSeverityFilter={setSeverityFilter}
          onDrag={handleDrag}
        />
        <IncidentDetail node={selectedNode} />
      </div>
    </section>
  );
}
```

Drag offsets live in `IncidentTab` state, so they're cleared automatically whenever `IncidentTab` unmounts (i.e. the user switches to the Overview tab) — matching the spec's "reset on tab switch" decision with no extra cleanup code needed. Switching environments doesn't unmount `IncidentTab` in the current app structure, but the incident graph is static mock data independent of environment, so this is fine.

- [ ] **Step 2: Add the `onDrag` prop and pointer-drag handling to `IncidentGraph`**

Change the `IncidentGraph` function signature:

```tsx
function IncidentGraph({
  nodes,
  selected,
  mode,
  severityFilter,
  onSelected,
  onMode,
  onSeverityFilter
}: {
  nodes: PositionedIncidentNode[];
  selected: string;
  mode: IncidentMode;
  severityFilter: SeverityFilter;
  onSelected: (id: string) => void;
  onMode: (mode: IncidentMode) => void;
  onSeverityFilter: (filter: SeverityFilter) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
```

to:

```tsx
function IncidentGraph({
  nodes,
  selected,
  mode,
  severityFilter,
  onSelected,
  onMode,
  onSeverityFilter,
  onDrag
}: {
  nodes: PositionedIncidentNode[];
  selected: string;
  mode: IncidentMode;
  severityFilter: SeverityFilter;
  onSelected: (id: string) => void;
  onMode: (mode: IncidentMode) => void;
  onSeverityFilter: (filter: SeverityFilter) => void;
  onDrag: (id: string, dx: number, dy: number) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; baseDx: number; baseDy: number; moved: boolean } | null>(null);
```

- [ ] **Step 3: Add the `useRef` import**

Change:

```ts
import { useEffect, useMemo, useState } from "react";
```

to:

```ts
import { useEffect, useMemo, useRef, useState } from "react";
```

- [ ] **Step 4: Replace the node card's click handler with pointer-drag handlers**

In the `nodes.map(...)` block inside `IncidentGraph` (from Task 4), change:

```tsx
            <div
              className={`incident-node-card ${node.status} ${isSelected ? "selected" : ""}`}
              key={node.id}
              style={{ left: node.x, top: node.y, width: node.w, height: node.h, opacity }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${node.name}`}
              onClick={() => onSelected(node.id)}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelected(node.id);
                }
              }}
            >
```

to:

```tsx
            <div
              className={`incident-node-card ${node.status} ${isSelected ? "selected" : ""}`}
              key={node.id}
              style={{ left: node.x, top: node.y, width: node.w, height: node.h, opacity }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${node.name}`}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered((current) => (current === node.id ? null : current))}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelected(node.id);
                }
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragState.current = {
                  id: node.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  baseDx: node.x - (basePositionsById.get(node.id)?.x ?? node.x),
                  baseDy: node.y - (basePositionsById.get(node.id)?.y ?? node.y),
                  moved: false
                };
              }}
              onPointerMove={(event) => {
                const drag = dragState.current;
                if (!drag || drag.id !== node.id) return;
                const deltaX = event.clientX - drag.startX;
                const deltaY = event.clientY - drag.startY;
                if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) drag.moved = true;
                if (drag.moved) onDrag(node.id, drag.baseDx + deltaX, drag.baseDy + deltaY);
              }}
              onPointerUp={(event) => {
                const drag = dragState.current;
                event.currentTarget.releasePointerCapture(event.pointerId);
                dragState.current = null;
                if (drag && drag.id === node.id && !drag.moved) onSelected(node.id);
              }}
            >
```

- [ ] **Step 5: Add `basePositionsById` so drag deltas are computed relative to the un-offset layout position**

`IncidentGraph` only receives `nodes` (already offset by drag state from `IncidentTab`). To compute a clean drag delta we need the node's pre-drag base position. Pass `basePositions` down alongside `nodes` for this purpose.

Update `IncidentTab`'s `<IncidentGraph .../>` call (from Step 1 above) to also pass `basePositions`:

```tsx
        <IncidentGraph
          nodes={positionedNodes}
          basePositions={basePositions}
          selected={selected}
          mode={mode}
          severityFilter={severityFilter}
          onSelected={setSelected}
          onMode={setMode}
          onSeverityFilter={setSeverityFilter}
          onDrag={handleDrag}
        />
```

Update the `IncidentGraph` signature (from Step 2 above) to accept it and derive the lookup map:

```tsx
function IncidentGraph({
  nodes,
  basePositions,
  selected,
  mode,
  severityFilter,
  onSelected,
  onMode,
  onSeverityFilter,
  onDrag
}: {
  nodes: PositionedIncidentNode[];
  basePositions: PositionedIncidentNode[];
  selected: string;
  mode: IncidentMode;
  severityFilter: SeverityFilter;
  onSelected: (id: string) => void;
  onMode: (mode: IncidentMode) => void;
  onSeverityFilter: (filter: SeverityFilter) => void;
  onDrag: (id: string, dx: number, dy: number) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const dragState = useRef<{ id: string; startX: number; startY: number; baseDx: number; baseDy: number; moved: boolean } | null>(null);
  const basePositionsById = useMemo(() => new Map(basePositions.map((node) => [node.id, node])), [basePositions]);
```

- [ ] **Step 6: Add cursor styling for draggable cards**

In `src/renderer/styles.css`, change:

```css
.incident-node-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  cursor: pointer;
  user-select: none;
  background: var(--surface);
  border: 1.3px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
```

to:

```css
.incident-node-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  background: var(--surface);
  border: 1.3px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.incident-node-card:active {
  cursor: grabbing;
}
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 8: Verify visually**

Run: `npm run dev`
Checklist:
- Incident Map nodes are visibly larger cards showing name, status pill, latency, and errors.
- Clicking a node (without moving the pointer) selects it and updates the detail panel, same as before.
- Pressing and dragging a node moves it smoothly, connected edges follow in real time.
- Switching to Overview and back to Incident Map resets dragged nodes to their auto-layout positions.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/App.tsx src/renderer/styles.css
git commit -m "feat: make incident graph nodes draggable with click-vs-drag detection"
```

---

## Task 6: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors.

- [ ] **Step 2: Confirm fonts load locally, not from network**

Run: `npm run dev`, open Electron devtools (View → Toggle Developer Tools or the app's dev shortcut), check the Network tab for font requests.
Expected: font files load from `http://127.0.0.1:5173/node_modules/@fontsource/...` (or bundled `dist/assets/...` in a production build), never from `fonts.googleapis.com` or any external host.

- [ ] **Step 3: Manual run-through**

Checklist:
- Sidebar nav on the left with Gazer brand at top, Overview/Incident Map items below, active item visually distinct.
- UI text renders in Inter; logs, endpoints, last-action, and graph card metrics render in JetBrains Mono.
- Overview and Incident Map panels look flatter (shadow, not border-boxed) with bigger headings/KPI numbers.
- Log rows (Overview log panel and Incident Map correlated logs) are taller, have a colored left border per level, and are easy to scan.
- Incident graph nodes are large cards with status pill + latency/errors; dragging works and edges follow; clicking still selects without requiring drag-free precision (4px threshold).
- No console errors in Electron devtools.

- [ ] **Step 4: Commit any final fixups**

If Step 3 surfaces issues, fix them in the relevant file from Tasks 1-5, then:

```bash
git add -A
git commit -m "fix: address issues found in v2 UI redesign verification pass"
```

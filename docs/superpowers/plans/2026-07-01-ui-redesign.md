# Gazer UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Gazer's Electron renderer into a cleaner, more organized white-themed ops console: remove CPU/memory metrics in favor of an errors/warnings counter, and overhaul the Incident Map into an interactive, auto-laid-out dependency graph.

**Architecture:** Three files change: `src/data/mock.ts` (drop cpu/memory fields), `src/renderer/App.tsx` (KPI/table rework, new layered-graph layout engine, hover/filter/animation state for the incident map), `src/renderer/styles.css` (visual system tightening + new incident map styles). No new dependencies; layout is a hand-rolled BFS layering function.

**Tech Stack:** React 18 + TypeScript, Electron, Vite. No test runner is configured in this repo — verification is `npm run typecheck` plus manual visual checks via `npm run dev`.

---

## Task 1: Remove CPU/memory from the data model

**Files:**
- Modify: `src/data/mock.ts`

- [ ] **Step 1: Remove `cpu`/`memory` from the `Service` interface**

In `src/data/mock.ts`, change:

```ts
export interface Service {
  id: string;
  name: string;
  kind: "api" | "worker" | "database" | "queue" | "edge" | "scheduler";
  status: ServiceStatus;
  version: string;
  replicas: number;
  region: string;
  uptime: string;
  latencyMs: number;
  cpu: number;
  memory: number;
  errorRate: number;
  owner: string;
  endpoint: string;
  logs: ServiceLog[];
}
```

to:

```ts
export interface Service {
  id: string;
  name: string;
  kind: "api" | "worker" | "database" | "queue" | "edge" | "scheduler";
  status: ServiceStatus;
  version: string;
  replicas: number;
  region: string;
  uptime: string;
  latencyMs: number;
  errorRate: number;
  owner: string;
  endpoint: string;
  logs: ServiceLog[];
}
```

- [ ] **Step 2: Remove `cpu`/`memory` from every `service({...})` literal**

Remove the `cpu: <n>,` and `memory: <n>,` lines from each of the 9 service literals in `mockEnvironments` (`prod-gateway`, `prod-checkout`, `prod-billing`, `prod-postgres`, `stage-gateway`, `stage-search`, `stage-events`, `dev-api`, `dev-scheduler`).

- [ ] **Step 3: Remove cpu/memory drift from `appendMockLog`**

Change:

```ts
  const drift = status === "up" ? Math.round((Math.random() - 0.45) * 8) : Math.round(Math.random() * 18);

  return {
    ...service,
    status,
    uptime: service.status === "starting" && status === "up" ? "<1m" : service.uptime,
    latencyMs: Math.max(0, service.latencyMs + drift),
    cpu: Math.max(0, Math.min(99, service.cpu + Math.round((Math.random() - 0.5) * 8))),
    memory: Math.max(0, Math.min(99, service.memory + Math.round((Math.random() - 0.45) * 5))),
    logs: [
```

to:

```ts
  const drift = status === "up" ? Math.round((Math.random() - 0.45) * 8) : Math.round(Math.random() * 18);

  return {
    ...service,
    status,
    uptime: service.status === "starting" && status === "up" ? "<1m" : service.uptime,
    latencyMs: Math.max(0, service.latencyMs + drift),
    logs: [
```

- [ ] **Step 4: Add a log-count helper used by the UI**

At the end of `src/data/mock.ts`, add:

```ts
export function logCounts(service: Service): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const log of service.logs) {
    if (log.level === "error") errors += 1;
    else if (log.level === "warn") warnings += 1;
  }
  return { errors, warnings };
}
```

- [ ] **Step 5: Verify typecheck fails (expected — App.tsx still references cpu/memory)**

Run: `npm run typecheck`
Expected: FAIL, errors in `src/renderer/App.tsx` referencing `cpu`/`memory` (e.g. `Property 'cpu' does not exist on type 'Service'`). This confirms Step 1-3 took effect; App.tsx is fixed in Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/data/mock.ts
git commit -m "refactor: remove cpu/memory from Service model, add logCounts helper"
```

---

## Task 2: Rework Overview tab KPIs and service table

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update imports**

Replace the `lucide-react` import block (lines 1-21) with one that drops `Cpu`/`HardDrive` (no longer used for metrics) and adds `AlertCircle` for the new KPI icon:

```ts
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleStop,
  Clock3,
  Cpu,
  Database,
  GitBranch,
  Globe2,
  Play,
  RefreshCcw,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  SquareActivity,
  TerminalSquare,
  Zap
} from "lucide-react";
```

(`Cpu` is kept — still used as the `ServiceIcon` for `kind: "worker"`. `HardDrive` is dropped since the Memory KPI is gone.)

- [ ] **Step 2: Update the `mock` import to bring in `logCounts`**

Change:

```ts
import {
  appendMockLog,
  applyActionToService,
  mockEnvironments,
  type Environment,
  type Service,
  type ServiceLog,
  type ServiceStatus
} from "../data/mock";
```

to:

```ts
import {
  appendMockLog,
  applyActionToService,
  logCounts,
  mockEnvironments,
  type Environment,
  type Service,
  type ServiceLog,
  type ServiceStatus
} from "../data/mock";
```

- [ ] **Step 3: Remove the `Meter` component's use in `ServiceRow`, add an errors/warnings badge**

Replace the whole `ServiceRow` function:

```tsx
function ServiceRow({ service, active, onClick }: { service: Service; active: boolean; onClick: () => void }) {
  const cpuTone = service.cpu > 80 ? "danger" : service.cpu > 65 ? "warning" : "success";
  const memTone = service.memory > 80 ? "warning" : "info";

  return (
    <button className={`service-row ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="service-name">
        <span className="service-icon">
          <ServiceIcon kind={service.kind} />
        </span>
        <span>
          <strong>{service.name}</strong>
          <small>{service.kind} / {service.owner}</small>
        </span>
      </span>
      <StatusPill status={service.status} />
      <span className="metric-cell">{service.replicas}</span>
      <span className="metric-with-meter">
        <span>{service.cpu}%</span>
        <Meter value={service.cpu} tone={cpuTone} />
      </span>
      <span className="metric-with-meter">
        <span>{service.memory}%</span>
        <Meter value={service.memory} tone={memTone} />
      </span>
      <span className="metric-cell">{service.latencyMs}ms</span>
      <span className={`metric-cell ${service.errorRate > 1 ? "danger-text" : ""}`}>{service.errorRate.toFixed(2)}%</span>
    </button>
  );
}
```

with:

```tsx
function ServiceRow({ service, active, onClick }: { service: Service; active: boolean; onClick: () => void }) {
  const { errors, warnings } = logCounts(service);

  return (
    <button className={`service-row ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="service-name">
        <span className="service-icon">
          <ServiceIcon kind={service.kind} />
        </span>
        <span>
          <strong>{service.name}</strong>
          <small>{service.kind} / {service.owner}</small>
        </span>
      </span>
      <StatusPill status={service.status} />
      <span className="metric-cell">{service.replicas}</span>
      <span className="metric-cell">{service.latencyMs}ms</span>
      <span className="issue-badge">
        <span className={errors > 0 ? "danger-text" : "muted"}>{errors} err</span>
        <span className={warnings > 0 ? "warning-text" : "muted"}>{warnings} warn</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Remove the now-unused `Meter` component**

Delete the `Meter` function entirely:

```tsx
function Meter({ value, tone = "info" }: { value: number; tone?: string }) {
  return (
    <div className="meter" aria-label={`${Math.round(value)} percent`}>
      <span className={tone} style={{ width: `${clamp(value)}%` }} />
    </div>
  );
}
```

- [ ] **Step 5: Update the service table header in `OverviewTab`**

Change:

```tsx
              <div className="service-head" role="row">
                <span>Service</span>
                <span>Status</span>
                <span>Rep</span>
                <span>CPU</span>
                <span>Mem</span>
                <span>Latency</span>
                <span>Errors</span>
              </div>
```

to:

```tsx
              <div className="service-head" role="row">
                <span>Service</span>
                <span>Status</span>
                <span>Rep</span>
                <span>Latency</span>
                <span>Issues</span>
              </div>
```

- [ ] **Step 6: Replace the KPI row computation in `App`**

Replace the `kpis` useMemo body:

```tsx
  const kpis = useMemo(() => {
    const cpu = metricAverage(env.services, "cpu");
    const memory = metricAverage(env.services, "memory");
    const latency = metricAverage(env.services, "latencyMs");
    const errorRate = metricAverage(env.services, "errorRate");

    return [
      {
        label: "Fleet health",
        value: `${health.healthy}/${health.total}`,
        detail: health.risk > 0 ? `${health.risk} needs attention` : "all services nominal",
        icon: ShieldCheck,
        tone: health.risk > 0 ? "warning" : "success",
        trend: env.services.map((item) => (item.status === "up" ? 88 : item.status === "degraded" ? 52 : 18))
      },
      {
        label: "CPU load",
        value: `${Math.round(cpu)}%`,
        detail: "fleet average",
        icon: Cpu,
        tone: cpu > 75 ? "danger" : "info",
        trend: env.services.map((item) => item.cpu)
      },
      {
        label: "Memory",
        value: `${Math.round(memory)}%`,
        detail: "resident pressure",
        icon: HardDrive,
        tone: memory > 75 ? "warning" : "info",
        trend: env.services.map((item) => item.memory)
      },
      {
        label: "Latency",
        value: `${Math.round(latency)}ms`,
        detail: `${errorRate.toFixed(2)}% errors`,
        icon: Zap,
        tone: latency > 180 || errorRate > 1 ? "warning" : "success",
        trend: env.services.map((item) => Math.min(100, item.latencyMs / 3))
      }
    ];
  }, [env, health.healthy, health.risk, health.total]);
```

with:

```tsx
  const kpis = useMemo(() => {
    const latency = metricAverage(env.services, "latencyMs");
    const errorRate = metricAverage(env.services, "errorRate");
    const counts = env.services.reduce(
      (total, item) => {
        const { errors, warnings } = logCounts(item);
        return { errors: total.errors + errors, warnings: total.warnings + warnings };
      },
      { errors: 0, warnings: 0 }
    );

    return [
      {
        label: "Fleet health",
        value: `${health.healthy}/${health.total}`,
        detail: health.risk > 0 ? `${health.risk} needs attention` : "all services nominal",
        icon: ShieldCheck,
        tone: health.risk > 0 ? "warning" : "success",
        trend: env.services.map((item) => (item.status === "up" ? 88 : item.status === "degraded" ? 52 : 18))
      },
      {
        label: "Errors & warnings",
        value: `${counts.errors} / ${counts.warnings}`,
        detail: counts.errors > 0 ? "errors need triage" : "no active errors",
        icon: AlertCircle,
        tone: counts.errors > 0 ? "danger" : counts.warnings > 0 ? "warning" : "success",
        trend: env.services.map((item) => {
          const { errors, warnings } = logCounts(item);
          return Math.min(100, errors * 25 + warnings * 10);
        })
      },
      {
        label: "Latency",
        value: `${Math.round(latency)}ms`,
        detail: `${errorRate.toFixed(2)}% errors`,
        icon: Zap,
        tone: latency > 180 || errorRate > 1 ? "warning" : "success",
        trend: env.services.map((item) => Math.min(100, item.latencyMs / 3))
      }
    ];
  }, [env, health.healthy, health.risk, health.total]);
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no remaining references to `cpu`, `memory`, `HardDrive`, `Meter`, `metricAverage(..., "cpu" | "memory")`).

If `metricAverage`'s type signature (`key: "cpu" | "memory" | "latencyMs" | "errorRate"`) still lists `"cpu" | "memory"`, narrow it:

```ts
function metricAverage(services: Service[], key: "latencyMs" | "errorRate") {
```

- [ ] **Step 8: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: replace CPU/memory KPIs and columns with errors/warnings counter"
```

---

## Task 3: CSS for the issues badge and tightened visual system

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Replace `.meter`/`.metric-with-meter` rules with `.issue-badge`**

Remove:

```css
.metric-with-meter {
  display: grid;
  gap: 5px;
  color: var(--text-soft);
  font-variant-numeric: tabular-nums;
}

.meter {
  width: 100%;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #eeeeee;
}

.meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
}
```

Add in its place:

```css
.issue-badge {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Update the service table grid column counts**

Change:

```css
.service-head,
.service-row {
  display: grid;
  grid-template-columns: minmax(210px, 1.5fr) 112px 48px minmax(88px, 0.75fr) minmax(88px, 0.75fr) 76px 70px;
  align-items: center;
  gap: 12px;
}
```

to:

```css
.service-head,
.service-row {
  display: grid;
  grid-template-columns: minmax(210px, 1.5fr) 112px 48px 76px 110px;
  align-items: center;
  gap: 12px;
}
```

- [ ] **Step 3: Update the KPI grid to 3 columns**

Change:

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
```

to:

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
```

And in the `@media (max-width: 1240px)` block, change:

```css
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
```

to:

```css
  .kpi-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
```

(3 cards collapse to 1-per-row on narrow widths instead of an uneven 2+1 split.)

- [ ] **Step 4: Widen major panel gaps slightly for breathing room**

Change:

```css
.workspace {
  min-width: 0;
  min-height: 0;
  padding: 18px;
  overflow: hidden;
}
```

to:

```css
.workspace {
  min-width: 0;
  min-height: 0;
  padding: 20px;
  overflow: hidden;
}
```

Change:

```css
.overview-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  height: 100%;
  min-height: 0;
}
```

to:

```css
.overview-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 20px;
  height: 100%;
  min-height: 0;
}
```

Change:

```css
.overview-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) 238px;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}
```

to:

```css
.overview-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) 238px;
  gap: 20px;
  min-width: 0;
  min-height: 0;
}
```

Change:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 16px;
  min-height: 0;
}
```

to:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 20px;
  min-height: 0;
}
```

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Expected: app launches, Overview tab shows 3 KPI cards in a row, service table shows Service/Status/Rep/Latency/Issues columns with "N err / N warn" text, no console errors about missing `cpu`/`memory`.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/styles.css
git commit -m "style: tighten overview layout spacing and replace meter styles with issue badge"
```

---

## Task 4: Incident graph layout engine (auto-layout by layers)

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Drop `x/y/w/h` from `IncidentNode` and the node data**

Change the interface:

```ts
interface IncidentNode {
  id: string;
  name: string;
  owner: string;
  kind: Service["kind"];
  status: "healthy" | "affected" | "failing";
  x: number;
  y: number;
  w: number;
  h: number;
  latency: string;
  errors: string;
  replicas: string;
  impact: string[];
}
```

to:

```ts
interface IncidentNode {
  id: string;
  name: string;
  owner: string;
  kind: Service["kind"];
  status: "healthy" | "affected" | "failing";
  latency: string;
  errors: string;
  replicas: string;
  impact: string[];
}

interface PositionedIncidentNode extends IncidentNode {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

Remove the `x`, `y`, `w`, `h` fields (and their values) from each of the 8 objects in the `incidentNodes` array, keeping `id`/`name`/`owner`/`kind`/`status`/`latency`/`errors`/`replicas`/`impact` as-is.

- [ ] **Step 2: Add the layering layout function**

After the `incidentEdges` array, add:

```ts
const GRAPH_COLUMN_WIDTH = 230;
const GRAPH_NODE_WIDTH = 150;
const GRAPH_NODE_HEIGHT = 64;
const GRAPH_ROW_HEIGHT = 92;
const GRAPH_TOP_MARGIN = 40;

function computeLayeredPositions(nodes: IncidentNode[], edges: Array<[string, string]>): PositionedIncidentNode[] {
  const incoming = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  for (const [, to] of edges) {
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  const queue: string[] = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  for (const id of queue) layer.set(id, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layer.get(current) ?? 0;
    for (const [from, to] of edges) {
      if (from !== current) continue;
      const candidate = currentLayer + 1;
      if ((layer.get(to) ?? -1) < candidate) {
        layer.set(to, candidate);
        queue.push(to);
      }
    }
  }

  const byLayer = new Map<number, string[]>();
  for (const node of nodes) {
    const value = layer.get(node.id) ?? 0;
    const bucket = byLayer.get(value) ?? [];
    bucket.push(node.id);
    byLayer.set(value, bucket);
  }

  const positionById = new Map<string, { x: number; y: number }>();
  for (const [layerIndex, ids] of byLayer.entries()) {
    const totalHeight = ids.length * GRAPH_ROW_HEIGHT;
    const startY = GRAPH_TOP_MARGIN + Math.max(0, (560 - totalHeight) / 2);
    ids.forEach((id, rowIndex) => {
      positionById.set(id, {
        x: GRAPH_TOP_MARGIN + layerIndex * GRAPH_COLUMN_WIDTH,
        y: startY + rowIndex * GRAPH_ROW_HEIGHT
      });
    });
  }

  return nodes.map((node) => {
    const position = positionById.get(node.id) ?? { x: GRAPH_TOP_MARGIN, y: GRAPH_TOP_MARGIN };
    return { ...node, x: position.x, y: position.y, w: GRAPH_NODE_WIDTH, h: GRAPH_NODE_HEIGHT };
  });
}
```

- [ ] **Step 3: Update `graphNode`, `nodeCenter`, `edgePath` to work with positioned nodes**

Change:

```ts
function graphNode(id: string) {
  return incidentNodes.find((node) => node.id === id) ?? incidentNodes[0];
}

function nodeCenter(node: IncidentNode) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function relatedNodes(id: string) {
  const upstream = incidentEdges.filter(([, to]) => to === id).map(([from]) => from);
  const downstream = incidentEdges.filter(([from]) => from === id).map(([, to]) => to);
  return { upstream, downstream, all: new Set([id, ...upstream, ...downstream]) };
}

function edgePath(fromId: string, toId: string) {
  const from = nodeCenter(graphNode(fromId));
  const to = nodeCenter(graphNode(toId));
  const bend = Math.max(72, Math.abs(to.x - from.x) * 0.44);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}
```

to:

```ts
function nodeCenter(node: PositionedIncidentNode) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function relatedNodes(id: string) {
  const upstream = incidentEdges.filter(([, to]) => to === id).map(([from]) => from);
  const downstream = incidentEdges.filter(([from]) => from === id).map(([, to]) => to);
  return { upstream, downstream, all: new Set([id, ...upstream, ...downstream]) };
}

function edgePath(nodesById: Map<string, PositionedIncidentNode>, fromId: string, toId: string) {
  const fromNode = nodesById.get(fromId);
  const toNode = nodesById.get(toId);
  if (!fromNode || !toNode) return "";
  const from = nodeCenter(fromNode);
  const to = nodeCenter(toNode);
  const bend = Math.max(72, Math.abs(to.x - from.x) * 0.44);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
}
```

`graphNode` is removed — `IncidentDetail` is updated in Task 5 to take the resolved node directly instead of looking it up by id internally.

- [ ] **Step 4: Run typecheck (expected to fail until Task 5 updates the call sites)**

Run: `npm run typecheck`
Expected: FAIL — `IncidentGraph` and `IncidentDetail` still reference the old `incidentNodes`/`graphNode`/`edgePath` shapes. This is fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: add layered auto-layout engine for incident graph"
```

---

## Task 5: Incident graph interactivity (hover, severity filter, animated edges, legend)

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update `IncidentTab` to own severity filter state and pass positioned nodes down**

Replace the `IncidentTab` function:

```tsx
function IncidentTab() {
  const [selected, setSelected] = useState("checkout");
  const [mode, setMode] = useState<IncidentMode>("impact");

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
        <IncidentGraph selected={selected} mode={mode} onSelected={setSelected} onMode={setMode} />
        <IncidentDetail selected={selected} />
      </div>
    </section>
  );
}
```

with:

```tsx
type SeverityFilter = "all" | "failing" | "affected";

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

- [ ] **Step 2: Rewrite `IncidentGraph` with hover preview, severity filter, animated edges, legend**

Replace the entire `IncidentGraph` function with:

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
  const relation = relatedNodes(selected);
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const hoveredNode = hovered ? nodesById.get(hovered) : undefined;

  const matchesFilter = (status: IncidentNode["status"]) =>
    severityFilter === "all" || (severityFilter === "failing" && status === "failing") || (severityFilter === "affected" && status === "affected");

  return (
    <section className="panel incident-graph-panel">
      <div className="incident-graph-toolbar">
        <div>
          <p>Dependency Graph</p>
          <h2>Production impact map</h2>
          <span>Select a process to isolate upstream and downstream risk.</span>
        </div>
        <div className="incident-graph-controls">
          <div className="mode-group" aria-label="Severity filter">
            {(["all", "failing", "affected"] as SeverityFilter[]).map((item) => (
              <button
                className={`mode-button ${severityFilter === item ? "active" : ""}`}
                type="button"
                key={item}
                onClick={() => onSeverityFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mode-group" aria-label="Graph mode">
            {(["impact", "errors", "recovery"] as IncidentMode[]).map((item) => (
              <button className={`mode-button ${mode === item ? "active" : ""}`} type="button" key={item} onClick={() => onMode(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {hoveredNode ? (
        <div className="incident-tooltip" style={{ left: hoveredNode.x + hoveredNode.w + 24, top: hoveredNode.y }}>
          <strong>{hoveredNode.name}</strong>
          <span>Status: {hoveredNode.status}</span>
          <span>Latency: {hoveredNode.latency}</span>
          <span>Errors: {hoveredNode.errors}</span>
          <span>Replicas: {hoveredNode.replicas}</span>
        </div>
      ) : null}

      <div className="incident-legend">
        <span><i className="legend-dot healthy" /> Healthy</span>
        <span><i className="legend-dot affected" /> Affected</span>
        <span><i className="legend-dot failing" /> Failing</span>
        <span><i className="legend-line active" /> Selected path</span>
        <span><i className="legend-line error" /> Error path</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update `IncidentDetail` to accept the resolved node instead of an id**

Replace:

```tsx
function IncidentDetail({ selected }: { selected: string }) {
  const node = graphNode(selected);
  const relation = relatedNodes(selected);
```

with:

```tsx
function IncidentDetail({ node }: { node: PositionedIncidentNode }) {
  const relation = relatedNodes(node.id);
```

And update the `logs` lookup line:

```tsx
  const logs = incidentLogs[selected] ?? [];
```

to:

```tsx
  const logs = incidentLogs[node.id] ?? [];
```

(The rest of `IncidentDetail`'s body already references the local `node` variable and is unchanged.)

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: add hover preview, severity filter, animated edges, and legend to incident graph"
```

---

## Task 6: CSS for the redesigned incident graph

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Add controls wrapper and tooltip styles**

After the existing `.mode-group`/`.mode-button` rules, add:

```css
.incident-graph-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.incident-tooltip {
  position: absolute;
  z-index: 3;
  display: grid;
  gap: 3px;
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
  font-size: 12px;
  pointer-events: none;
}

.incident-tooltip strong {
  font-size: 13px;
}

.incident-tooltip span {
  color: var(--text-muted);
}
```

- [ ] **Step 2: Add legend styles**

```css
.incident-legend {
  position: absolute;
  z-index: 2;
  left: 16px;
  bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  font-size: 11px;
  font-weight: 650;
  color: var(--text-muted);
}

.incident-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--success);
}

.legend-dot.affected {
  background: var(--warning);
}

.legend-dot.failing {
  background: var(--danger);
}

.legend-line {
  display: inline-block;
  width: 16px;
  height: 2px;
  background: var(--text);
}

.legend-line.error {
  background: var(--danger);
}
```

- [ ] **Step 3: Add animated dash flow for active edges**

Replace:

```css
.incident-edge.active {
  color: var(--text);
  stroke-width: 3.2;
  opacity: 1;
}
```

with:

```css
.incident-edge.active {
  color: var(--text);
  stroke-width: 3.2;
  opacity: 1;
}

.incident-edge.flowing {
  stroke-dasharray: 6 5;
  animation: incident-flow 900ms linear infinite;
}

@keyframes incident-flow {
  to {
    stroke-dashoffset: -22;
  }
}

.incident-edge.dimmed {
  opacity: 0.12;
}
```

- [ ] **Step 4: Respect reduced motion for the new animation**

In the existing `@media (prefers-reduced-motion: reduce)` block, the blanket `animation-duration: 0.01ms !important` rule already covers `.incident-edge.flowing` — no additional change needed. Confirm by inspection only.

- [ ] **Step 5: Verify visually**

Run: `npm run dev`
Expected: Incident Map tab shows nodes auto-positioned in columns by dependency depth (no overlaps), hovering a node shows a tooltip to its right, the severity filter chip group (all/failing/affected) dims non-matching nodes/edges, edges touching the selected node show a moving dash animation, and a legend appears bottom-left of the graph panel.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/styles.css
git commit -m "style: add incident graph tooltip, legend, filter, and flow animation styles"
```

---

## Task 7: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors.

- [ ] **Step 2: Grep for leftover cpu/memory references**

Run: `grep -rn "cpu\|memory" src/`
Expected: No remaining references to the removed `Service.cpu`/`Service.memory` fields (matches in unrelated contexts, e.g. comments, are fine — confirm none reference the deleted fields).

- [ ] **Step 3: Manual run-through**

Run: `npm run dev`
Checklist:
- Overview: 3 KPI cards (Fleet health, Errors & warnings, Latency), service table has Service/Status/Rep/Latency/Issues columns, switching environments/services still works, log search still filters.
- Incident Map: graph nodes are laid out in clear left-to-right layers with no overlapping boxes, clicking a node updates the detail panel and timeline stays static, hovering shows the tooltip, severity filter dims correctly, selected node's edges animate, legend is visible and readable.
- No console errors in the Electron devtools.

- [ ] **Step 4: Commit any final fixups**

If Step 3 surfaces issues, fix them in the relevant file from Tasks 1-6, then:

```bash
git add -A
git commit -m "fix: address issues found in final UI redesign verification pass"
```

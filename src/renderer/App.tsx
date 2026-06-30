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
import { useEffect, useMemo, useRef, useState } from "react";
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

type Action = "start" | "stop" | "restart" | "deploy";
type AppTab = "overview" | "incident";
type IncidentMode = "impact" | "errors" | "recovery";

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

const statusLabels: Record<ServiceStatus, string> = {
  up: "Healthy",
  degraded: "Degraded",
  down: "Down",
  starting: "Starting",
  stopped: "Stopped"
};

const statusTone: Record<ServiceStatus, string> = {
  up: "success",
  degraded: "warning",
  down: "danger",
  starting: "info",
  stopped: "muted"
};

const actionMeta = {
  start: { label: "Start", icon: Play },
  stop: { label: "Stop", icon: CircleStop },
  restart: { label: "Restart", icon: RefreshCcw },
  deploy: { label: "Deploy", icon: Rocket }
} as const;

const incidentNodes: IncidentNode[] = [
  {
    id: "gateway",
    name: "Gateway",
    owner: "platform",
    kind: "edge",
    status: "healthy",
    latency: "42ms",
    errors: "0.03%",
    replicas: "8",
    impact: ["Routes 42.8k rpm", "Customer-facing 503s originate downstream"]
  },
  {
    id: "auth",
    name: "Auth API",
    owner: "identity",
    kind: "api",
    status: "healthy",
    latency: "63ms",
    errors: "0.08%",
    replicas: "4",
    impact: ["Token checks within budget", "No current incident contribution"]
  },
  {
    id: "checkout",
    name: "Checkout API",
    owner: "commerce",
    kind: "api",
    status: "failing",
    latency: "211ms",
    errors: "1.27%",
    replicas: "6",
    impact: ["Primary degraded customer path", "Retries amplify billing and orders pressure", "Checkout conversion at risk"]
  },
  {
    id: "catalog",
    name: "Catalog API",
    owner: "merch",
    kind: "api",
    status: "healthy",
    latency: "74ms",
    errors: "0.11%",
    replicas: "3",
    impact: ["Product data remains healthy", "Shares events stream only"]
  },
  {
    id: "orders",
    name: "Orders DB",
    owner: "data",
    kind: "database",
    status: "affected",
    latency: "18ms",
    errors: "0.00%",
    replicas: "3",
    impact: ["Connection pool active=92", "Retry bursts increase write pressure"]
  },
  {
    id: "billing",
    name: "Billing Worker",
    owner: "payments",
    kind: "worker",
    status: "failing",
    latency: "timeout",
    errors: "14.8%",
    replicas: "0",
    impact: ["Root-cause candidate", "Settlement jobs stalled", "Timeouts cascade into checkout"]
  },
  {
    id: "events",
    name: "Events Queue",
    owner: "platform",
    kind: "queue",
    status: "affected",
    latency: "8ms",
    errors: "0.00%",
    replicas: "2",
    impact: ["Depth increased to 18.2k", "Consumer lag 6.4s"]
  },
  {
    id: "notify",
    name: "Notifier",
    owner: "engage",
    kind: "worker",
    status: "healthy",
    latency: "48ms",
    errors: "0.04%",
    replicas: "2",
    impact: ["Receipts delayed only when queue lag grows"]
  }
];

const incidentEdges: Array<[string, string]> = [
  ["gateway", "auth"],
  ["gateway", "checkout"],
  ["gateway", "catalog"],
  ["checkout", "orders"],
  ["checkout", "billing"],
  ["checkout", "events"],
  ["catalog", "events"],
  ["billing", "events"],
  ["events", "notify"]
];

const GRAPH_COLUMN_WIDTH = 280;
const GRAPH_NODE_WIDTH = 220;
const GRAPH_NODE_HEIGHT = 100;
const GRAPH_ROW_HEIGHT = 140;
const GRAPH_TOP_MARGIN = 40;
const GRAPH_CANVAS_WIDTH = 1180;
const GRAPH_CANVAS_HEIGHT = 760;

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
    const startY = GRAPH_TOP_MARGIN + Math.max(0, (GRAPH_CANVAS_HEIGHT - GRAPH_TOP_MARGIN * 2 - totalHeight) / 2);
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

const incidentTimeline = [
  ["12:05", "critical", "Billing replicas dropped to zero", "Checkout retries now account for 34% of payment calls."],
  ["12:04", "critical", "Checkout error rate crossed 1%", "Gateway shows customer-facing 503 spikes."],
  ["12:03", "warning", "Orders pool pressure detected", "Write traffic from checkout retries increased."],
  ["12:01", "warning", "Events queue depth rising", "Consumer lag passed the warning threshold."],
  ["11:58", "ok", "Deploy marker received", "Revision 2026.06.29-1 deployed to checkout-api."]
] as const;

const incidentLogs: Record<string, ServiceLog[]> = {
  gateway: [
    { id: 1, timestamp: "12:04:41", level: "info", message: "gateway: route=/checkout upstream=checkout-api status=503" },
    { id: 2, timestamp: "12:03:58", level: "warn", message: "gateway: upstream p95 crossed 200ms" },
    { id: 3, timestamp: "12:02:12", level: "info", message: "gateway: rate limit normal bucket=public-api" }
  ],
  auth: [
    { id: 4, timestamp: "12:04:18", level: "info", message: "auth-api: token verification ok issuer=primary" },
    { id: 5, timestamp: "12:01:44", level: "info", message: "auth-api: policy cache hit ttl=57s" }
  ],
  checkout: [
    { id: 6, timestamp: "12:05:13", level: "error", message: "checkout-api: payment authorization failed dependency=billing" },
    { id: 7, timestamp: "12:04:51", level: "warn", message: "checkout-api: retry storm detected attempts=3" },
    { id: 8, timestamp: "12:03:37", level: "error", message: "checkout-api: p95=211ms error_rate=1.27" }
  ],
  catalog: [
    { id: 9, timestamp: "12:04:09", level: "info", message: "catalog-api: snapshot served revision=8842" },
    { id: 10, timestamp: "12:01:20", level: "info", message: "catalog-api: cache hit ratio=94%" }
  ],
  orders: [
    { id: 11, timestamp: "12:05:08", level: "warn", message: "orders-db: connection pool active=92 idle=4" },
    { id: 12, timestamp: "12:03:33", level: "info", message: "orders-db: write latency p95=18ms" }
  ],
  billing: [
    { id: 13, timestamp: "12:05:16", level: "error", message: "billing-worker: worker unavailable replicas=0" },
    { id: 14, timestamp: "12:04:42", level: "error", message: "billing-worker: settlement queue retry exhausted" },
    { id: 15, timestamp: "12:02:24", level: "warn", message: "billing-worker: pod restarted reason=OOMKilled" }
  ],
  events: [
    { id: 16, timestamp: "12:05:18", level: "warn", message: "events-queue: queue depth=18240 consumer_lag=6.4s" },
    { id: 17, timestamp: "12:03:47", level: "info", message: "events-queue: topic checkout.events receiving" }
  ],
  notify: [
    { id: 18, timestamp: "12:04:22", level: "info", message: "notifier: receipt dispatch delayed source=events" },
    { id: 19, timestamp: "12:01:14", level: "info", message: "notifier: email provider healthy" }
  ]
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function metricAverage(services: Service[], key: "latencyMs" | "errorRate") {
  if (services.length === 0) return 0;
  return services.reduce((total, service) => total + service[key], 0) / services.length;
}

function healthFor(env: Environment) {
  const healthy = env.services.filter((service) => service.status === "up").length;
  const risk = env.services.filter((service) => service.status === "down" || service.status === "degraded").length;
  return { healthy, risk, total: env.services.length };
}

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

function Sparkline({ values, tone = "info" }: { values: number[]; tone?: string }) {
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 34 - (clamp(value) / 100) * 28;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className={`sparkline ${tone}`} viewBox="0 0 100 38" role="img" aria-label="Metric trend">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusPill({ status }: { status: ServiceStatus }) {
  return <span className={`status-pill ${statusTone[status]}`}>{statusLabels[status]}</span>;
}

function ServiceIcon({ kind }: { kind: Service["kind"] }) {
  const icons = {
    api: Server,
    worker: Cpu,
    database: Database,
    queue: Boxes,
    edge: Globe2,
    scheduler: Clock3
  };
  const Icon = icons[kind];
  return <Icon size={16} aria-hidden="true" />;
}

function EnvironmentButton({ env, active, onClick }: { env: Environment; active: boolean; onClick: () => void }) {
  const health = healthFor(env);
  return (
    <button className={`environment-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="environment-title">
        <span>{env.name}</span>
        <span className={health.risk > 0 ? "risk-dot" : "ok-dot"} />
      </span>
      <span className="environment-meta">
        {env.region} / {health.healthy} of {health.total} healthy
      </span>
    </button>
  );
}

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

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  trend
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ShieldCheck;
  tone: string;
  trend: number[];
}) {
  return (
    <section className="kpi-card">
      <div className={`kpi-icon ${tone}`}>
        <Icon size={17} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <Sparkline values={trend} tone={tone} />
    </section>
  );
}

function LogPanel({ service, query, onQuery }: { service: Service; query: string; onQuery: (value: string) => void }) {
  const filtered = service.logs
    .filter((log) => {
      const search = query.trim().toLowerCase();
      if (!search) return true;
      return log.message.toLowerCase().includes(search) || log.level.includes(search);
    })
    .slice(-12)
    .reverse();

  return (
    <section className="panel logs-panel">
      <div className="panel-heading">
        <div>
          <p>Live Logs</p>
          <h2>{service.name}</h2>
        </div>
        <label className="search-box">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Search logs</span>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter logs" />
        </label>
      </div>
      <div className="logs-list">
        {filtered.length === 0 ? (
          <div className="empty-state">No logs match the current filter.</div>
        ) : (
          filtered.map((log) => (
            <div className={`log-line ${log.level}`} key={log.id}>
              <span className="log-time">{log.timestamp}</span>
              <span className={`log-level-badge ${log.level}`}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DetailPanel({
  env,
  service,
  onAction,
  lastAction
}: {
  env: Environment;
  service: Service;
  onAction: (action: Action) => void;
  lastAction: string;
}) {
  return (
    <aside className="panel detail-panel">
      <div className="detail-header">
        <span className={`detail-orb ${statusTone[service.status]}`}>
          <ServiceIcon kind={service.kind} />
        </span>
        <div>
          <p>Selected Service</p>
          <h2>{service.name}</h2>
        </div>
        <StatusPill status={service.status} />
      </div>

      <div className="detail-grid">
        <span>Version</span>
        <strong>{service.version}</strong>
        <span>Owner</span>
        <strong>{service.owner}</strong>
        <span>Uptime</span>
        <strong>{service.uptime}</strong>
        <span>Endpoint</span>
        <strong className="endpoint">{service.endpoint}</strong>
        <span>Deploy window</span>
        <strong className={env.deployWindow === "open" ? "success-text" : "warning-text"}>{env.deployWindow}</strong>
      </div>

      <div className="slo-block">
        <div>
          <span>Latency p95</span>
          <strong>{service.latencyMs}ms</strong>
        </div>
        <div>
          <span>Error rate</span>
          <strong className={service.errorRate > 1 ? "danger-text" : ""}>{service.errorRate.toFixed(2)}%</strong>
        </div>
        <div>
          <span>Replicas</span>
          <strong>{service.replicas}</strong>
        </div>
      </div>

      <div className="action-grid" aria-label="Service actions">
        {(Object.keys(actionMeta) as Action[]).map((action) => {
          const Icon = actionMeta[action].icon;
          return (
            <button className="action-button" type="button" key={action} onClick={() => onAction(action)}>
              <Icon size={15} aria-hidden="true" />
              <span>{actionMeta[action].label}</span>
            </button>
          );
        })}
      </div>

      <div className="last-action">
        <TerminalSquare size={15} aria-hidden="true" />
        <span>Last operator action</span>
        <strong>{lastAction}</strong>
      </div>
    </aside>
  );
}

function OverviewTab({
  env,
  envs,
  envIndex,
  service,
  serviceIndex,
  query,
  lastAction,
  kpis,
  onEnvChange,
  onServiceChange,
  onQuery,
  onAction
}: {
  env: Environment;
  envs: Environment[];
  envIndex: number;
  service: Service;
  serviceIndex: number;
  query: string;
  lastAction: string;
  kpis: Array<{
    label: string;
    value: string;
    detail: string;
    icon: typeof ShieldCheck;
    tone: string;
    trend: number[];
  }>;
  onEnvChange: (index: number) => void;
  onServiceChange: (index: number) => void;
  onQuery: (value: string) => void;
  onAction: (action: Action) => void;
}) {
  const health = healthFor(env);

  return (
    <section className="overview-layout">
      <aside className="environment-panel panel">
        <div className="panel-heading compact">
          <div>
            <p>Environments</p>
            <h2>Targets</h2>
          </div>
        </div>
        <nav className="environment-list" aria-label="Environments">
          {envs.map((item, index) => (
            <EnvironmentButton key={item.id} env={item} active={index === envIndex} onClick={() => onEnvChange(index)} />
          ))}
        </nav>
      </aside>

      <section className="overview-main">
        <section className="kpi-grid" aria-label="Environment metrics">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <section className="dashboard-grid">
          <section className="panel service-panel">
            <div className="panel-heading">
              <div>
                <p>Service Inventory</p>
                <h2>{env.services.length} monitored services</h2>
              </div>
              <span className={health.risk > 0 ? "attention-chip" : "healthy-chip"}>
                {health.risk > 0 ? <AlertTriangle size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                {health.risk > 0 ? `${health.risk} risks` : "healthy"}
              </span>
            </div>

            <div className="service-table" role="table" aria-label="Services">
              <div className="service-head" role="row">
                <span>Service</span>
                <span>Status</span>
                <span>Rep</span>
                <span>Latency</span>
                <span>Issues</span>
              </div>
              {env.services.map((item, index) => (
                <ServiceRow key={item.id} service={item} active={index === serviceIndex} onClick={() => onServiceChange(index)} />
              ))}
            </div>
          </section>

          <DetailPanel env={env} service={service} onAction={onAction} lastAction={lastAction} />
        </section>

        <LogPanel service={service} query={query} onQuery={onQuery} />
      </section>
    </section>
  );
}

function IncidentTimeline() {
  return (
    <aside className="panel incident-timeline-panel">
      <div className="panel-heading compact">
        <div>
          <p>Incident Timeline</p>
          <h2>SEV-1 Checkout</h2>
        </div>
      </div>
      <div className="incident-timeline">
        {incidentTimeline.map(([time, state, title, body]) => (
          <div className={`incident-event ${state}`} key={`${time}-${title}`}>
            <strong>
              <span>{title}</span>
              <span>{time}</span>
            </strong>
            <small>{body}</small>
          </div>
        ))}
      </div>
    </aside>
  );
}

type SeverityFilter = "all" | "failing" | "affected";

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
  const relation = relatedNodes(selected);
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const basePositionsById = useMemo(() => new Map(basePositions.map((node) => [node.id, node])), [basePositions]);
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
                const base = basePositionsById.get(node.id);
                dragState.current = {
                  id: node.id,
                  startX: event.clientX,
                  startY: event.clientY,
                  baseDx: base ? node.x - base.x : 0,
                  baseDy: base ? node.y - base.y : 0,
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

function IncidentDetail({ node }: { node: PositionedIncidentNode }) {
  const relation = relatedNodes(node.id);
  const severity = node.status === "failing" ? "critical" : node.status === "affected" ? "at risk" : "healthy";
  const logs = incidentLogs[node.id] ?? [];

  return (
    <aside className="panel incident-detail-panel">
      <div className="detail-header">
        <span className={`detail-orb ${node.status === "failing" ? "danger" : node.status === "affected" ? "warning" : "success"}`}>
          <ServiceIcon kind={node.kind} />
        </span>
        <div>
          <p>Selected Process</p>
          <h2>{node.name}</h2>
        </div>
        <span className={`status-pill ${node.status === "failing" ? "danger" : node.status === "affected" ? "warning" : "success"}`}>
          {severity}
        </span>
      </div>

      <div className="incident-metrics">
        <div>
          <span>Latency</span>
          <strong>{node.latency}</strong>
        </div>
        <div>
          <span>Errors</span>
          <strong className={node.status === "failing" ? "danger-text" : ""}>{node.errors}</strong>
        </div>
        <div>
          <span>Replicas</span>
          <strong>{node.replicas}</strong>
        </div>
        <div>
          <span>Links</span>
          <strong>{relation.upstream.length} in / {relation.downstream.length} out</strong>
        </div>
      </div>

      <section>
        <h3>Impact</h3>
        <div className="impact-list">
          {node.impact.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </section>

      <div className="action-grid">
        <button className="action-button" type="button">
          <GitBranch size={15} aria-hidden="true" />
          <span>Open runbook</span>
        </button>
        <button className="action-button" type="button">
          <TerminalSquare size={15} aria-hidden="true" />
          <span>Page owner</span>
        </button>
      </div>

      <section className="incident-logs">
        <h3>Correlated Logs</h3>
        <div className="logs-list compact">
          {logs.map((log) => (
            <div className={`log-line ${log.level}`} key={log.id}>
              <span className="log-time">{log.timestamp}</span>
              <span className={`log-level-badge ${log.level}`}>{log.level}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

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
          basePositions={basePositions}
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

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("overview");
  const [envs, setEnvs] = useState<Environment[]>(mockEnvironments);
  const [envIndex, setEnvIndex] = useState(0);
  const [serviceIndex, setServiceIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [lastAction, setLastAction] = useState("boot");

  const env = envs[envIndex] ?? envs[0];
  const service = env.services[serviceIndex] ?? env.services[0];
  const health = healthFor(env);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEnvs((current) =>
        current.map((currentEnv) => ({
          ...currentEnv,
          services: currentEnv.services.map((currentService) => appendMockLog(currentService))
        }))
      );
    }, 1400);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setServiceIndex(0);
    setQuery("");
  }, [envIndex]);

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

  function runAction(action: Action) {
    setEnvs((current) =>
      current.map((currentEnv, currentEnvIndex) =>
        currentEnvIndex === envIndex
          ? {
              ...currentEnv,
              services: currentEnv.services.map((currentService, currentServiceIndex) =>
                currentServiceIndex === serviceIndex ? applyActionToService(currentService, action) : currentService
              )
            }
          : currentEnv
      )
    );
    setLastAction(`${action}:${service.name}`);
  }

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

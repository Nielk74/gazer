export type ServiceStatus = "up" | "down" | "degraded" | "starting" | "stopped";

export interface ServiceLog {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

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

export interface Environment {
  id: string;
  name: string;
  region: string;
  traffic: string;
  deployWindow: string;
  services: Service[];
}

const logMessages = [
  "request completed route=/v1/orders status=200",
  "cache hit key=tenant-config ttl=57s",
  "worker claimed job priority=high",
  "connection pool healthy active=18 idle=42",
  "health probe succeeded path=/ready",
  "deploy marker received revision=7f31c2a",
  "retrying upstream call attempt=2",
  "rate limit bucket refilled scope=public-api",
  "queue depth changed topic=events",
  "feature flag evaluated flag=checkout-v3",
  "slow query detected duration=842ms",
  "circuit breaker half-open dependency=billing",
  "pod restarted reason=OOMKilled",
  "TLS certificate rotation completed",
  "replica lag above threshold lag=6.4s"
];

let logId = 1000;

function makeLogs(serviceName: string, status: ServiceStatus, count = 18): ServiceLog[] {
  return Array.from({ length: count }, (_, index) => {
    const level =
      status === "down" && index % 4 === 0
        ? "error"
        : status === "degraded" && index % 3 === 0
          ? "warn"
          : index % 7 === 0
            ? "debug"
            : "info";
    const ageSeconds = (count - index) * 19;
    return {
      id: logId++,
      timestamp: new Date(Date.now() - ageSeconds * 1000).toLocaleTimeString(),
      level,
      message: `${serviceName}: ${logMessages[(index + serviceName.length) % logMessages.length]}`
    };
  });
}

function service(input: Omit<Service, "logs">): Service {
  return { ...input, logs: makeLogs(input.name, input.status) };
}

export const mockEnvironments: Environment[] = [
  {
    id: "prod",
    name: "Production",
    region: "eu-west-3",
    traffic: "42.8k rpm",
    deployWindow: "locked",
    services: [
      service({
        id: "prod-gateway",
        name: "gateway",
        kind: "edge",
        status: "up",
        version: "2026.06.29-4",
        replicas: 8,
        region: "global",
        uptime: "31d 4h",
        latencyMs: 42,
        errorRate: 0.03,
        owner: "platform",
        endpoint: "https://api.gazer.local"
      }),
      service({
        id: "prod-checkout",
        name: "checkout-api",
        kind: "api",
        status: "degraded",
        version: "2026.06.29-1",
        replicas: 6,
        region: "eu-west-3",
        uptime: "12d 8h",
        latencyMs: 211,
        errorRate: 1.27,
        owner: "commerce",
        endpoint: "http://checkout.prod.svc:8080"
      }),
      service({
        id: "prod-billing",
        name: "billing-worker",
        kind: "worker",
        status: "down",
        version: "2026.06.25-9",
        replicas: 0,
        region: "eu-west-3",
        uptime: "0m",
        latencyMs: 0,
        errorRate: 100,
        owner: "payments",
        endpoint: "queue://billing.settlement"
      }),
      service({
        id: "prod-postgres",
        name: "orders-db",
        kind: "database",
        status: "up",
        version: "16.4",
        replicas: 3,
        region: "eu-west-3",
        uptime: "89d 2h",
        latencyMs: 12,
        errorRate: 0,
        owner: "data",
        endpoint: "postgres://orders.prod.internal"
      })
    ]
  },
  {
    id: "stage",
    name: "Staging",
    region: "eu-west-1",
    traffic: "1.9k rpm",
    deployWindow: "open",
    services: [
      service({
        id: "stage-gateway",
        name: "gateway",
        kind: "edge",
        status: "up",
        version: "2026.06.30-rc2",
        replicas: 3,
        region: "global",
        uptime: "6d 1h",
        latencyMs: 55,
        errorRate: 0.08,
        owner: "platform",
        endpoint: "https://stage-api.gazer.local"
      }),
      service({
        id: "stage-search",
        name: "search-api",
        kind: "api",
        status: "starting",
        version: "2026.06.30-rc3",
        replicas: 2,
        region: "eu-west-1",
        uptime: "2m",
        latencyMs: 98,
        errorRate: 0.4,
        owner: "discovery",
        endpoint: "http://search.stage.svc:8080"
      }),
      service({
        id: "stage-events",
        name: "events-queue",
        kind: "queue",
        status: "up",
        version: "3.8.1",
        replicas: 2,
        region: "eu-west-1",
        uptime: "22d 9h",
        latencyMs: 8,
        errorRate: 0,
        owner: "platform",
        endpoint: "nats://events.stage.internal"
      })
    ]
  },
  {
    id: "dev",
    name: "Dev",
    region: "local",
    traffic: "synthetic",
    deployWindow: "open",
    services: [
      service({
        id: "dev-api",
        name: "api",
        kind: "api",
        status: "up",
        version: "local",
        replicas: 1,
        region: "local",
        uptime: "4h 18m",
        latencyMs: 24,
        errorRate: 0,
        owner: "devex",
        endpoint: "http://localhost:3000"
      }),
      service({
        id: "dev-scheduler",
        name: "scheduler",
        kind: "scheduler",
        status: "stopped",
        version: "local",
        replicas: 0,
        region: "local",
        uptime: "0m",
        latencyMs: 0,
        errorRate: 0,
        owner: "devex",
        endpoint: "cron://local"
      })
    ]
  }
];

export function appendMockLog(service: Service): Service {
  const status = service.status === "starting" && Math.random() > 0.55 ? "up" : service.status;
  const level =
    status === "down" ? "error" : status === "degraded" ? "warn" : Math.random() > 0.86 ? "debug" : "info";
  const message =
    status === "down"
      ? `${service.name}: failed health check dependency unreachable`
      : service.status === "starting" && status === "up"
        ? `${service.name}: readiness gates passed service is accepting traffic`
        : `${service.name}: ${logMessages[Math.floor(Math.random() * logMessages.length)]}`;

  const drift = status === "up" ? Math.round((Math.random() - 0.45) * 8) : Math.round(Math.random() * 18);

  return {
    ...service,
    status,
    uptime: service.status === "starting" && status === "up" ? "<1m" : service.uptime,
    latencyMs: Math.max(0, service.latencyMs + drift),
    logs: [
      ...service.logs.slice(-39),
      {
        id: logId++,
        timestamp: new Date().toLocaleTimeString(),
        level,
        message
      }
    ]
  };
}
export function applyActionToService(service: Service, action: "start" | "stop" | "restart" | "deploy"): Service {
  const nextStatus =
    action === "stop" ? "stopped" : action === "start" || action === "restart" || action === "deploy" ? "starting" : service.status;
  const actionLog: ServiceLog = {
    id: logId++,
    timestamp: new Date().toLocaleTimeString(),
    level: "warn",
    message: `${service.name}: operator action=${action} requested from gazer`
  };

  return {
    ...service,
    status: nextStatus,
    replicas: action === "stop" ? 0 : Math.max(1, service.replicas),
    uptime: action === "stop" ? "0m" : "warming",
    version: action === "deploy" && service.version !== "local" ? `${service.version}+hotfix` : service.version,
    logs: [...service.logs.slice(-39), actionLog]
  };
}

export function logCounts(service: Service): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const log of service.logs) {
    if (log.level === "error") errors += 1;
    else if (log.level === "warn") warnings += 1;
  }
  return { errors, warnings };
}



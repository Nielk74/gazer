# Gazer UI Redesign — Design Spec

Date: 2026-07-01

## Goal

Redesign Gazer's Electron renderer (`src/renderer/App.tsx`, `src/renderer/styles.css`, `src/data/mock.ts`) into a more professional, modern, organized, white-themed operations console. Remove CPU/memory metrics (not available in real deployment) in favor of an errors/warnings counter. Substantially improve the Incident Map's UX: better layout, more interactivity, clearer meaning.

## Non-goals

- No new dependencies (no graph layout library, no UI kit). Auto-layout is hand-rolled.
- No backend/IPC changes — this is presentation-layer only, still driven by `mock.ts`.
- No new tabs or features beyond what's described below.

## Data model changes (`src/data/mock.ts`)

- Remove `cpu` and `memory` from `Service` interface, from all `service({...})` literals, and from `appendMockLog`'s drift simulation.
- `ServiceLog.level` (`info | warn | error | debug`) becomes the source of truth for the new error/warning counters — no new fields needed; derive counts by scanning `service.logs`.

## Visual system

- Palette stays light/white but is tightened: neutral grayscale for structure (surfaces, borders, text), black/near-black for primary text and active states, and red/amber/green/blue reserved strictly for semantic status (failing/warning/healthy/info). No new brand accent color.
- Spacing: increase base gaps slightly (16px → 20px at major panel boundaries) and standardize a spacing scale (8/12/16/20/24) instead of ad hoc values.
- Radius/shadow: keep 8px radius and the existing soft shadow, applied consistently (some elements currently lack it).
- Typography: consistent eyebrow label style (12px uppercase, 700 weight, muted) for all panel/card headers; KPI numerals slightly larger and bolder for scannability.

## Overview tab

- **KPI row**: 4 cards → 3 cards: *Fleet health*, *Errors & Warnings* (new — fleet-wide count of `error`/`warn` log entries across the active environment's services, last N log lines per service), *Latency*. Grid adjusts from `repeat(4, 1fr)` to `repeat(3, 1fr)`.
- **Service table**: remove CPU/Mem columns and `Meter` component usage in the table. Add an **Errors/Warnings badge** column per row, e.g. "2 err · 1 warn" (red/amber text), derived per-service from `service.logs`. Column grid (`service-head`/`service-row`) updated accordingly: Service / Status / Replicas / Latency / Errors·Warnings.
- Detail panel, log panel: restyled (spacing, label consistency) but structurally unchanged — version/owner/uptime/endpoint/deploy window grid, SLO block, action buttons, last action footer all stay.
- `KpiCard`, `ServiceRow`, `Meter`, `Sparkline` components updated: `Meter`/CPU-Mem sparkline usage removed from the table; `Sparkline` stays for KPI trend lines (fleet health / errors / latency).

## Incident Map tab — full overhaul

**Layout engine**: Replace manually-placed `x/y/w/h` per node in `incidentNodes` with a computed layered layout:
1. Compute each node's layer (rank) via longest-path-from-root BFS over `incidentEdges` (roots = nodes with no incoming edge).
2. Within each layer, stack nodes vertically with even spacing, sized to fit the tallest layer.
3. Layer index maps to x position (fixed column width); vertical position computed per layer at render/useMemo time.
4. This replaces hardcoded coordinates — `incidentNodes` keeps name/owner/kind/status/metrics/impact but drops x/y/w/h; a `useMemo` in `IncidentGraph` computes positions from the edge list.

**Interactions**:
- **Hover preview**: hovering a node (separate from click-select) shows a floating tooltip near the cursor/node with status, latency, errors, replicas — using local hover state, doesn't change `selected`.
- **Severity filter**: new toggle chip group (All / Failing / Affected) above or beside the existing mode group. Filtering dims (opacity, same pattern as current relation-based dimming) nodes/edges that don't match, rather than removing them (keeps layout stable).
- **Animated flow on active edges**: edges touching the `selected` node get `stroke-dasharray` + CSS animation (dash offset) to show directional flow, layered on top of existing active/error/recovery edge classes.
- **Legend**: small static legend (in the graph panel, e.g. bottom-left) explaining node status colors and edge meaning (active / error path / recovery path).

**Unchanged**: `IncidentTimeline` and `IncidentDetail` side panels keep their current responsibilities (timeline list, selected-node detail + correlated logs), just restyled to match the new visual system. Mode group (impact/errors/recovery) stays as-is, severity filter is additive alongside it.

## Component-level summary of changes (`App.tsx`)

- `IncidentNode` type: drop `x/y/w/h`.
- New: `layeredPositions(nodes, edges)` helper — computes `{ id, x, y, w, h }` via BFS layering, memoized in `IncidentGraph`.
- `IncidentGraph`: add hover state, severity filter state (lifted to `IncidentTab` alongside `mode`/`selected`), tooltip render, animated edge classes, legend markup.
- `OverviewTab`/`KpiCard`/`ServiceRow`: drop cpu/memory props and rendering; add errors/warnings derivation helper (`logCounts(service)` returning `{ errors, warnings }`) and badge rendering.
- `Meter` component: removed if no longer used anywhere after CPU/Mem removal (check usage before deleting).

## Testing/verification

- `npm run typecheck` must pass after data model and component changes.
- Manually run the app (`npm run dev` or equivalent) and verify: Overview KPI row shows 3 cards with correct error/warning counts, service table shows badges, Incident Map renders with computed layered positions (no overlaps), hover tooltip appears, severity filter dims correctly, selected-node edges animate, legend is present.

# Gazer UI Redesign v2 — Design Spec

Date: 2026-07-01

## Context

Round 1 (see `2026-07-01-ui-redesign-design.md`) removed CPU/memory metrics, added an errors/warnings counter, and gave the Incident Map a layered auto-layout with hover/filter/animation. The user found the result too conservative: they want a genuinely modern, Vercel-dashboard-like look (https://vercel.com/), a real font upgrade, much more readable logs, and bigger/movable incident graph nodes. This spec covers that second pass on top of round 1's already-implemented changes.

## Goal

Reskin Gazer's renderer toward a Vercel-dashboard aesthetic: bundled modern fonts, a left sidebar nav, flatter/whitespace-driven panels, bigger type scale, far more legible logs, and bigger draggable incident graph nodes.

## Non-goals

- No persistence of dragged node positions to disk — drag state lives in React state for the current Incident Map session and resets on tab/environment switch.
- No new app tabs/pages beyond the existing Overview / Incident Map.
- Not pulling in a full design-system/component library — hand-rolled CSS, same as before, just restructured.

## Fonts & design tokens

- Add new dependencies: `@fontsource/inter` (variable weight) and `@fontsource/jetbrains-mono` (400/500/600/700), imported in `src/renderer/main.tsx` so they're bundled by Vite and work fully offline in the packaged Electron app (no network fetch).
- `:root` font stack becomes `"Inter", ui-sans-serif, system-ui, sans-serif` for UI text; a new `--font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace` variable replaces the ad hoc monospace stacks used for logs/endpoints/last-action.
- Type scale increases: KPI numbers 25px → 32px, panel `h2` 18px → 20px, incident summary `h1` 28px → 34px, base body stays 16px but logs increase from 12px → 13px.
- Panel style flattens: introduce a `--surface-flat` treatment — most internal panels keep the white surface but drop the 1px border + shadow combo in favor of either a shadow-only or border-only look depending on nesting depth (top-level panels: subtle shadow, no border; nested blocks like detail-grid/slo-block: subtle background tint, no border). Exactly one boxed/bordered style remains for emphasis (e.g. selected/active states).

## Layout & navigation

- Replace `.app-tabs` (top pill tab bar) with a left sidebar (`.app-sidebar`, fixed 220px width): Gazer brand/icon at top, then nav items for Overview and Incident Map as icon+label rows with a filled-background active state (no pill shape).
- `.app-shell` grid changes from `rows: 64px / 1fr` to a `columns: 220px / 1fr` outer grid with the existing header logic now only spanning the content column as a slim top bar (window-drag region, deploy-window chip, traffic chip). Brand moves out of the header into the sidebar.
- `.workspace` padding increases further (20px → 28px) for more whitespace, consistent with the flatter panel style.
- Overview tab's environment-switcher panel is unchanged in concept — stays as an in-page panel — just restyled to match the flatter token system.

## Logs

- `.log-line` rows: min-height 28px → 36px, padding increases, font size 12px → 13px (`--font-mono`).
- Each row gets a `border-left: 3px solid <level-color>` plus a faint background tint per level (reusing the existing `--success/--warning/--danger/--info` tokens at low opacity), replacing the current plain colored-text-only level indicator.
- Column layout becomes a clearer fixed grid: timestamp column, level-badge column (fixed width, pill-shaped mini badge instead of plain text), message column takes remaining space. Applies to both the Overview `LogPanel` and the Incident Map's `IncidentDetail` correlated logs.

## Incident graph

- Node size increases from 150×64px (already-set in round 1) to 220×100px. Node content becomes a small card: top row = service name + status pill; bottom 2-column mini-grid = latency, error rate, replicas (reusing data already on `IncidentNode`).
- `GRAPH_COLUMN_WIDTH`/`GRAPH_ROW_HEIGHT` constants increase to fit the larger nodes without overlap; SVG `viewBox` grows accordingly.
- Nodes become draggable: pointer-down + pointer-move on a node updates a per-node `{ id: { dx, dy } }` offset map held in `IncidentTab` state (sibling to `selected`/`mode`/`severityFilter`). Rendered node position = auto-layout position + offset. Edges (`edgePath`) read the same offset-adjusted positions so they stay connected while dragging.
- Drag offsets reset (cleared) whenever the user switches tabs away from Incident Map or changes environment — i.e. they live only as long as the `IncidentTab` component instance, no explicit save/reset button needed since unmounting clears state naturally. This is confirmed scope, not persisted to disk.
- Dragging a node should not also trigger node selection — use a small movement threshold (e.g. >4px) to distinguish a click (select) from a drag (reposition).

## Testing/verification

- `npm run typecheck` must pass.
- `npm install` picks up the two new font dependencies; `npm run dev` / `npm run build` must succeed with fonts loading from local files (verify via devtools Network tab showing no external font requests).
- Manual run-through: sidebar nav present and functional, fonts visibly changed (Inter for UI, JetBrains Mono for logs/numbers), logs show per-level left-border + tinted background, incident graph nodes are visibly larger card-style with mini-metrics, dragging a node moves it and its connected edges follow, clicking (not dragging) still selects a node and updates the detail panel, drag state resets when leaving the Incident Map tab.

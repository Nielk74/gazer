# Gazer

Gazer is an Electron desktop dashboard for monitoring service health. It uses mocked environments, services, live logs, and operator actions so the app can run locally without external infrastructure.

## How It Works

- `src/electron/main.ts` creates the Electron window and loads Vite in development or the built renderer in production.
- `src/renderer/App.tsx` renders the dashboard: environments, fleet KPIs, service inventory, service details, actions, and live logs.
- `src/data/mock.ts` owns the mock service model, log stream, and action mutations.
- `assets/` contains packaged app icons. `public/icon.svg` is used by the renderer.

## Development

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and opens the Electron app.

## Build

```bash
npm run build
```

This builds the renderer, bundles Electron main/preload files, and creates a Windows installer in `release/`.

## Install

Run:

```text
release/Gazer Setup 0.1.0.exe
```

That installer contains everything the app needs. To distribute the app, give users only:

```text
release/Gazer Setup 0.1.0.exe
```

You do not need to copy `dist/`, `dist-electron/`, `assets/`, `node_modules`, or the source files to the target machine. The `.blockmap` file is only useful for auto-update workflows and is not required for manual install.

For local testing without installing, run:

```text
release/win-unpacked/Gazer.exe
```

If you distribute the unpacked app instead of the installer, copy the entire folder:

```text
release/win-unpacked/
```

Do not copy only `Gazer.exe` from that folder. It depends on the adjacent Electron runtime files and `resources/` directory.

Useful commands:

```bash
npm run build:app
npm run build:unpacked
npm run typecheck
```

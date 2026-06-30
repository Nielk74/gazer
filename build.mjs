import { build } from "esbuild";
import { rmSync } from "fs";
import { build as viteBuild } from "vite";

rmSync("dist-electron", { recursive: true, force: true });

await viteBuild();

await build({
  entryPoints: ["src/electron/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist-electron/main.cjs",
  external: ["electron"]
});

await build({
  entryPoints: ["src/electron/preload.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist-electron/preload.cjs",
  external: ["electron"]
});

console.log("Built Electron app");

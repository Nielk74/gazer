import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("gazer", {
  platform: process.platform
});

import {
  BrowserWindow,
  defineElectrobunRPC,
  Utils,
} from "electrobun/bun";
import { existsSync } from "fs";
import { extname } from "path";
import { homedir } from "os";
import type { AppRPCSchema } from "./rpc";
import { loadSettings, saveSettings, getDefaultFolders } from "./settings";
import { scanLibrary } from "./library";

// ─── Audio file MIME types ─────────────────────────────────────────────────

const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".opus": "audio/opus",
  ".webm": "audio/webm",
  ".wma": "audio/x-ms-wma",
  ".aiff": "audio/aiff",
  ".aif": "audio/aiff",
};

// ─── Local audio HTTP server ───────────────────────────────────────────────

const audioServer = Bun.serve({
  port: 0,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/audio") {
      const filePath = url.searchParams.get("p");
      if (!filePath) return new Response("Missing path", { status: 400 });
      if (!existsSync(filePath))
        return new Response("File not found", { status: 404 });

      const ext = extname(filePath).toLowerCase();
      const contentType = AUDIO_MIME[ext] ?? "audio/mpeg";
      const file = Bun.file(filePath);

      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    if (url.pathname === "/ping") {
      return new Response("pong", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },
});

const audioPort = audioServer.port;
console.log(`[aueio] Audio server running on port ${audioPort}`);

// ─── RPC setup ────────────────────────────────────────────────────────────

const rpc = defineElectrobunRPC<AppRPCSchema, "bun">("bun", {
  maxRequestTime: 10_000,
  handlers: {
    requests: {
      getSettings: async () => {
        return loadSettings();
      },

      saveSettings: async (settings) => {
        await saveSettings(settings);
      },

      scanLibrary: async ({ folders }) => {
        const tracks = await scanLibrary(folders);
        return tracks;
      },

      getAudioPort: async () => {
        return audioPort;
      },

      pickFolder: async () => {
        try {
          const result = await Utils.showOpenDialog({
            properties: ["openDirectory"],
            title: "Select Music Folder",
          });
          if (result.canceled || !result.filePaths.length) return null;
          return result.filePaths[0] ?? null;
        } catch {
          return null;
        }
      },

      getDefaultFolders: async () => {
        return getDefaultFolders();
      },
    },
  },
});

// ─── Main window ──────────────────────────────────────────────────────────

const win = new BrowserWindow({
  title: "Aüeio Player",
  url: "views://app/index.html",
  frame: { x: 100, y: 80, width: 940, height: 680 },
  titleBarStyle: "hiddenInset",
  transparent: false,
  hidden: false,
  navigationRules: null,
  sandbox: false,
  html: null,
  preload: null,
  renderer: "native",
  rpc,
});

console.log(`[aueio] Window created, id=${win.id}`);

// ─── Kick off initial library scan when ready ─────────────────────────────

const triggerInitialScan = async () => {
  const settings = await loadSettings();
  if (!settings.folders.length) return;

  console.log(`[aueio] Scanning ${settings.folders.length} folder(s)…`);
  const tracks = await scanLibrary(settings.folders);
  console.log(`[aueio] Found ${tracks.length} tracks`);

  // Send update to webview after a short delay to ensure it's ready
  setTimeout(() => {
    try {
      rpc.send.libraryUpdated(tracks);
    } catch {
      // webview may not be ready yet – it will request via RPC instead
    }
  }, 1500);
};

triggerInitialScan();

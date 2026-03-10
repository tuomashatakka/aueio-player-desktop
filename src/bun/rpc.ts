// ─── Shared domain types ───────────────────────────────────────────────────

export type Track = {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  size: number;
  coverColor?: string;
};

export type AppSettings = {
  folders: string[];
  volume: number;
  lastTrackPath?: string;
};

// ─── RPC schema ────────────────────────────────────────────────────────────
// Convention:
//   bun.requests   = requests the Bun main-process HANDLES (called from webview)
//   webview.requests = requests the webview HANDLES (called from bun)
//   bun.messages   = one-way messages bun RECEIVES from webview
//   webview.messages = one-way messages webview RECEIVES from bun

export type AppRPCSchema = {
  bun: {
    requests: {
      getSettings: { params: undefined; response: AppSettings };
      saveSettings: { params: AppSettings; response: void };
      scanLibrary: { params: { folders: string[] }; response: Track[] };
      getAudioPort: { params: undefined; response: number };
      pickFolder: { params: undefined; response: string | null };
      getDefaultFolders: { params: undefined; response: string[] };
    };
    messages: {};
  };
  webview: {
    requests: {};
    messages: {
      libraryUpdated: Track[];
      settingsSaved: AppSettings;
    };
  };
};

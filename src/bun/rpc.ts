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
  // Extended tags
  genre?: string;
  year?: number;
  rating?: number;        // 0–5
  comment?: string;
  trackNumber?: number;
  diskNumber?: number;
};

export type TrackTagOverrides = Omit<
  Partial<Track>,
  'id' | 'path' | 'size' | 'coverColor' | 'duration'
>;

export type AppSettings = {
  folders: string[];
  volume: number;
  lastTrackPath?: string;
  theme?: string;
};

// ─── RPC schema ────────────────────────────────────────────────────────────

export type AppRPCSchema = {
  bun: {
    requests: {
      getSettings: { params: undefined; response: AppSettings };
      saveSettings: { params: AppSettings; response: void };
      scanLibrary: { params: { folders: string[] }; response: Track[] };
      getAudioPort: { params: undefined; response: number };
      pickFolder: { params: undefined; response: string | null };
      getDefaultFolders: { params: undefined; response: string[] };
      saveTrackTags: { params: { id: string; tags: TrackTagOverrides }; response: void };
      getTrackTags: { params: undefined; response: Record<string, TrackTagOverrides> };
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

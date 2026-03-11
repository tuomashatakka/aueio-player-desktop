// ─── Shared domain types ───────────────────────────────────────────────────

export type Track = {
  readonly id:           string;
  readonly path:         string;
  readonly title:        string;
  readonly artist:       string;
  readonly album:        string;
  readonly duration:     number;
  readonly size:         number;
  readonly coverColor?:  string;
  // Extended tags
  readonly genre?:       string;
  readonly year?:        number;
  readonly rating?:      number; // 0–5
  readonly comment?:     string;
  readonly trackNumber?: number;
  readonly diskNumber?:  number;
}

export type TrackTagOverrides = Omit<
  Partial<Track>,
  'id' | 'path' | 'size' | 'coverColor' | 'duration'
>

export type AppSettings = {
  readonly folders:        readonly string[];
  readonly volume:         number;
  readonly lastTrackPath?: string;
  readonly theme?:         string;
}

// ─── RPC schema ────────────────────────────────────────────────────────────

export type AppRPCSchema = {
  readonly bun: {
    readonly requests: {
      readonly getSettings:       { readonly params: undefined; readonly response: AppSettings };
      readonly saveSettings:      { readonly params: AppSettings; readonly response: void };
      readonly scanLibrary:       { readonly params: { readonly folders: readonly string[] }; readonly response: readonly Track[] };
      readonly getAudioPort:      { readonly params: undefined; readonly response: number };
      readonly pickFolder:        { readonly params: undefined; readonly response: string | null };
      readonly getDefaultFolders: { readonly params: undefined; readonly response: readonly string[] };
      readonly saveTrackTags:     { readonly params: { readonly id: string; readonly tags: TrackTagOverrides }; readonly response: void };
      readonly getTrackTags:      { readonly params: undefined; readonly response: Record<string, TrackTagOverrides> };
    };
    readonly messages: Record<string, never>;
  };
  readonly webview: {
    readonly requests: Record<string, never>;
    readonly messages: {
      readonly libraryUpdated: readonly Track[];
      readonly settingsSaved:  AppSettings;
    };
  };
}

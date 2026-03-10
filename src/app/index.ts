import { Electroview } from "electrobun/view";
import type { AppRPCSchema, Track, AppSettings } from "../bun/rpc";

// ─── RPC setup ────────────────────────────────────────────────

const rpc = Electroview.defineRPC<AppRPCSchema>({
  handlers: {
    requests: {},
    messages: {
      libraryUpdated: (tracks) => {
        state.tracks = tracks;
        renderTrackList();
        hideLoading();
      },
      settingsSaved: (settings) => {
        state.settings = settings;
        renderFolderList();
      },
    },
  },
});

new Electroview({ rpc });

// ─── App state ────────────────────────────────────────────────

type ViewName = "library" | "settings";

type PlayerState = {
  tracks: Track[];
  filteredTracks: Track[];
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  activeView: ViewName;
  isNowPlayingExpanded: boolean;
  settings: AppSettings;
  audioPort: number;
  waveformData: Float32Array | null;
  searchQuery: string;
};

const state: PlayerState = {
  tracks: [],
  filteredTracks: [],
  currentTrackIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  activeView: "library",
  isNowPlayingExpanded: false,
  settings: { folders: [], volume: 1 },
  audioPort: 0,
  waveformData: null,
  searchQuery: "",
};

// ─── Audio engine ──────────────────────────────────────────────

const audioEl = new Audio();
audioEl.preload = "metadata";

let audioCtx: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let animFrameId = 0;

const ensureAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    sourceNode = audioCtx.createMediaElementSource(audioEl);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
  }
};

// ─── DOM refs ─────────────────────────────────────────────────

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const elLibraryView = $("library-view");
const elSettingsView = $("settings-view");
const elNowPlayingView = $("now-playing-view");
const elNowPlayingBar = $("now-playing-bar");
const elTrackList = $("track-list");
const elLoadingOverlay = $("loading-overlay");
const elLibraryEmpty = $("library-empty");
const elTrackCount = $("track-count");
const elSearchInput = $<HTMLInputElement>("search-input");
const elFolderList = $("folder-list");
const elAddFolderBtn = $("add-folder-btn");

const elNavLibrary = $("nav-library");
const elNavSettings = $("nav-settings");
const elEmptyGotoSettings = $("empty-goto-settings");

// Now Playing bar
const elNpBarTitle = $("np-bar-title");
const elNpBarArtist = $("np-bar-artist");
const elNpBarAlbumIcon = $("np-bar-album-icon");
const elNpBarExpand = $("np-bar-expand");
const elNpBarPlayBtn = $("np-bar-play-btn");
const elNpBarPrevBtn = $("np-bar-prev-btn");
const elNpBarNextBtn = $("np-bar-next-btn");
const elNpBarWaveform = $<HTMLCanvasElement>("np-bar-waveform");

// Now Playing expanded
const elNpBg = $("np-bg");
const elNpBgColor = $("np-bg-color");
const elNpBackBtn = $("np-back-btn");
const elNpTitle = $("np-title");
const elNpArtist = $("np-artist");
const elNpAlbumArtTitle = $("np-album-art-title");
const elNpAlbumArt = $("np-album-art");
const elNpWaveformCanvas = $<HTMLCanvasElement>("np-waveform-canvas");
const elNpCurrentTime = $("np-current-time");
const elNpDuration = $("np-duration");
const elNpPlayBtn = $("np-play-btn");
const elNpPrevBtn = $("np-prev-btn");
const elNpNextBtn = $("np-next-btn");
const elNpVolume = $<HTMLInputElement>("np-volume");
const elNpWaveformContainer = $("np-waveform-container");
const elSettingsVolume = $<HTMLInputElement>("settings-volume");

// ─── Utility helpers ──────────────────────────────────────────

const formatTime = (secs: number): string => {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const currentTrack = (): Track | null =>
  state.currentTrackIndex >= 0
    ? (state.filteredTracks[state.currentTrackIndex] ?? null)
    : null;

// ─── View navigation ──────────────────────────────────────────

const showView = (view: ViewName) => {
  state.activeView = view;

  elLibraryView.classList.toggle("active", view === "library");
  elSettingsView.classList.toggle("active", view === "settings");

  elNavLibrary.classList.toggle("active", view === "library");
  elNavSettings.classList.toggle("active", view === "settings");
};

const expandNowPlaying = () => {
  state.isNowPlayingExpanded = true;
  elNowPlayingView.classList.add("active");
  renderNowPlayingExpanded();
};

const collapseNowPlaying = () => {
  state.isNowPlayingExpanded = false;
  elNowPlayingView.classList.remove("active");
};

// ─── Loading state ────────────────────────────────────────────

const showLoading = () => {
  elLoadingOverlay.removeAttribute("hidden");
  elTrackList.setAttribute("hidden", "");
  elLibraryEmpty.setAttribute("hidden", "");
};

const hideLoading = () => {
  elLoadingOverlay.setAttribute("hidden", "");
  const hasTracks = state.filteredTracks.length > 0;
  if (hasTracks) {
    elTrackList.removeAttribute("hidden");
    elLibraryEmpty.setAttribute("hidden", "");
  } else {
    elTrackList.setAttribute("hidden", "");
    elLibraryEmpty.removeAttribute("hidden");
  }
};

// ─── Track list rendering ─────────────────────────────────────

const filterTracks = () => {
  const q = state.searchQuery.toLowerCase().trim();
  state.filteredTracks = q
    ? state.tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      )
    : [...state.tracks];
};

const renderTrackList = () => {
  filterTracks();

  const count = state.filteredTracks.length;
  elTrackCount.textContent = count === 0 ? "" : `${count} track${count === 1 ? "" : "s"}`;

  if (count === 0) {
    elTrackList.setAttribute("hidden", "");
    elLibraryEmpty.removeAttribute("hidden");
    return;
  }

  elLibraryEmpty.setAttribute("hidden", "");
  elTrackList.removeAttribute("hidden");

  const frag = document.createDocumentFragment();
  state.filteredTracks.forEach((track, idx) => {
    const el = buildTrackItem(track, idx);
    frag.appendChild(el);
  });

  elTrackList.innerHTML = "";
  elTrackList.appendChild(frag);
};

const buildTrackItem = (track: Track, idx: number): HTMLElement => {
  const isPlaying = idx === state.currentTrackIndex && state.isPlaying;
  const isCurrent = idx === state.currentTrackIndex;

  const item = document.createElement("div");
  item.className = `track-item${isCurrent ? " playing" : ""}`;
  item.setAttribute("role", "listitem");
  item.setAttribute("tabindex", "0");
  item.dataset["trackIdx"] = String(idx);

  const color = track.coverColor ?? "hsl(220, 60%, 40%)";
  const emoji = getTrackEmoji(track);

  item.innerHTML = `
    <div class="track-cover">
      <div class="track-cover-bg" style="background: ${color}"></div>
      <span class="track-cover-icon">${emoji}</span>
    </div>
    <div class="track-info">
      <div class="track-title">${escapeHtml(track.title)}</div>
      <div class="track-artist">${escapeHtml(track.artist)}</div>
    </div>
    <div class="track-duration">${track.duration > 0 ? formatTime(track.duration) : ""}</div>
    <div class="track-playing-indicator" aria-hidden="true">
      ${isPlaying ? `<div class="playing-bars"><div class="playing-bar"></div><div class="playing-bar"></div><div class="playing-bar"></div></div>` : ""}
    </div>
  `;

  const play = () => playTrack(idx);
  item.addEventListener("click", play);
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      play();
    }
  });

  return item;
};

const getTrackEmoji = (track: Track): string => {
  const ext = track.path.split(".").pop()?.toLowerCase() ?? "";
  const emojiMap: Record<string, string> = {
    mp3: "🎵", flac: "🎼", wav: "🔊", m4a: "🎶", ogg: "🎵",
    aac: "🎵", opus: "🎵", wma: "🎵",
  };
  return emojiMap[ext] ?? "🎵";
};

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ─── Audio playback ───────────────────────────────────────────

const buildAudioUrl = (path: string): string =>
  `http://localhost:${state.audioPort}/audio?p=${encodeURIComponent(path)}`;

const playTrack = async (idx: number) => {
  const track = state.filteredTracks[idx];
  if (!track) return;

  const wasPlaying = state.currentTrackIndex === idx && state.isPlaying;
  if (wasPlaying) {
    togglePlayPause();
    return;
  }

  state.currentTrackIndex = idx;
  state.waveformData = null;

  ensureAudioContext();
  audioEl.src = buildAudioUrl(track.path);
  audioEl.volume = state.volume;
  audioEl.currentTime = 0;

  try {
    await audioEl.play();
    state.isPlaying = true;
  } catch (err) {
    console.error("[aueio] playback error:", err);
    state.isPlaying = false;
  }

  updatePlaybackUI();
  renderTrackList();
  loadWaveform(track.path);
};

const togglePlayPause = async () => {
  if (!currentTrack()) return;
  ensureAudioContext();

  if (state.isPlaying) {
    audioEl.pause();
    state.isPlaying = false;
  } else {
    await audioCtx?.resume();
    await audioEl.play();
    state.isPlaying = true;
  }
  updatePlaybackUI();
};

const playNext = () => {
  if (!state.filteredTracks.length) return;
  const next = (state.currentTrackIndex + 1) % state.filteredTracks.length;
  playTrack(next);
};

const playPrev = () => {
  if (!state.filteredTracks.length) return;
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  const prev =
    (state.currentTrackIndex - 1 + state.filteredTracks.length) %
    state.filteredTracks.length;
  playTrack(prev);
};

// ─── Waveform ─────────────────────────────────────────────────

const loadWaveform = async (path: string) => {
  if (!state.audioPort) return;

  try {
    const url = buildAudioUrl(path);
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();

    const ctx = audioCtx ?? new AudioContext();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);

    const channelData = audioBuf.getChannelData(0);
    const samples = 200;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] ?? 0);
      }
      waveform[i] = sum / blockSize;
    }

    // Normalize
    const max = Math.max(...Array.from(waveform), 0.001);
    for (let i = 0; i < waveform.length; i++) {
      waveform[i] = (waveform[i] ?? 0) / max;
    }

    state.waveformData = waveform;
    drawWaveform();
  } catch (err) {
    console.warn("[aueio] waveform load failed:", err);
    // Draw a flat placeholder
    state.waveformData = new Float32Array(200).fill(0.3);
    drawWaveform();
  }
};

const drawWaveform = () => {
  drawWaveformToCanvas(elNpWaveformCanvas, true);
  drawWaveformToCanvas(elNpBarWaveform, false);
};

const drawWaveformToCanvas = (
  canvas: HTMLCanvasElement,
  showProgress: boolean
) => {
  const waveform = state.waveformData;
  if (!waveform) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || canvas.offsetWidth || 400;
  const h = rect.height || canvas.offsetHeight || 80;

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const progress =
    state.duration > 0 ? state.currentTime / state.duration : 0;
  const progressX = progress * w;

  const barW = w / waveform.length;
  const gap = Math.max(1, barW * 0.15);
  const barActual = barW - gap;

  for (let i = 0; i < waveform.length; i++) {
    const amp = waveform[i] ?? 0;
    const barH = Math.max(2, amp * h * 0.85);
    const x = i * barW;
    const y = (h - barH) / 2;

    const isPast = showProgress && x + barActual < progressX;
    const isCurrent =
      showProgress && x <= progressX && x + barActual >= progressX;

    if (isPast) {
      ctx.fillStyle = "#3a86ff"; // accent-alt = played
    } else if (isCurrent) {
      ctx.fillStyle = "#ff5500"; // accent = playhead
    } else {
      ctx.fillStyle = showProgress
        ? "rgba(255,255,255,0.15)"
        : "rgba(58,134,255,0.4)";
    }

    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(1, barActual), barH, 1.5);
    ctx.fill();
  }
};

// ─── Playback UI sync ─────────────────────────────────────────

const updatePlaybackUI = () => {
  const track = currentTrack();
  const playIcon = state.isPlaying ? "⏸" : "▶";

  // Bar
  if (track) {
    elNowPlayingBar.removeAttribute("hidden");
    elNpBarTitle.textContent = track.title;
    elNpBarArtist.textContent = track.artist;
    elNpBarAlbumIcon.textContent = getTrackEmoji(track);
    const color = track.coverColor ?? "hsl(220,60%,40%)";
    (elNpBarAlbumIcon.parentElement as HTMLElement).style.background = color;
  } else {
    elNowPlayingBar.setAttribute("hidden", "");
  }

  elNpBarPlayBtn.textContent = playIcon;
  elNpPlayBtn.textContent = playIcon;

  // Expanded
  renderNowPlayingExpanded();
};

const renderNowPlayingExpanded = () => {
  const track = currentTrack();
  if (!track) return;

  elNpTitle.textContent = track.title;
  elNpArtist.textContent = track.artist;
  elNpAlbumArtTitle.textContent = getTrackEmoji(track);

  const color = track.coverColor ?? "hsl(220,60%,40%)";
  elNpAlbumArt.style.background = color;
  elNpBgColor.style.background = color;

  // Album image bg: use color since we don't have actual images
  elNpBg.style.background = color;

  elNpAlbumArt.classList.toggle("playing", state.isPlaying);
};

// ─── Audio element events ─────────────────────────────────────

audioEl.addEventListener("timeupdate", () => {
  state.currentTime = audioEl.currentTime;
  state.duration = audioEl.duration || 0;

  elNpCurrentTime.textContent = formatTime(state.currentTime);
  elNpDuration.textContent = formatTime(state.duration);
  elNpWaveformContainer.setAttribute(
    "aria-valuenow",
    String(Math.round((state.currentTime / (state.duration || 1)) * 100))
  );

  if (state.isNowPlayingExpanded || elNowPlayingBar.offsetParent !== null) {
    drawWaveform();
  }
});

audioEl.addEventListener("ended", () => {
  playNext();
});

audioEl.addEventListener("error", (e) => {
  console.error("[aueio] Audio error:", e);
  state.isPlaying = false;
  updatePlaybackUI();
});

audioEl.addEventListener("loadedmetadata", () => {
  state.duration = audioEl.duration;
  elNpDuration.textContent = formatTime(state.duration);

  // Update track duration in state
  const track = currentTrack();
  if (track) {
    track.duration = audioEl.duration;
    renderTrackList();
  }
});

// ─── Settings rendering ───────────────────────────────────────

const renderFolderList = () => {
  const folders = state.settings.folders;
  elFolderList.innerHTML = "";

  if (folders.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "color:var(--text-muted);font-size:var(--text-sm)";
    empty.textContent = "No folders added yet";
    elFolderList.appendChild(empty);
    return;
  }

  folders.forEach((folder, idx) => {
    const item = document.createElement("div");
    item.className = "folder-item";
    item.innerHTML = `
      <span class="folder-icon">📁</span>
      <span class="folder-path" title="${escapeHtml(folder)}">${escapeHtml(folder)}</span>
      <button class="folder-remove-btn" aria-label="Remove folder" data-idx="${idx}">×</button>
    `;
    item.querySelector(".folder-remove-btn")?.addEventListener("click", () => {
      removeFolder(idx);
    });
    elFolderList.appendChild(item);
  });
};

const removeFolder = async (idx: number) => {
  const updated = { ...state.settings };
  updated.folders = updated.folders.filter((_, i) => i !== idx);
  state.settings = updated;
  await rpc.request.saveSettings(updated);
  renderFolderList();
  // Re-scan
  triggerScan();
};

const addFolder = async () => {
  const picked = await rpc.request.pickFolder();
  if (!picked) return;

  if (state.settings.folders.includes(picked)) return;

  const updated = {
    ...state.settings,
    folders: [...state.settings.folders, picked],
  };
  state.settings = updated;
  await rpc.request.saveSettings(updated);
  renderFolderList();
  triggerScan();
};

const triggerScan = async () => {
  if (!state.settings.folders.length) {
    state.tracks = [];
    state.filteredTracks = [];
    hideLoading();
    return;
  }

  showLoading();
  try {
    const tracks = await rpc.request.scanLibrary({
      folders: state.settings.folders,
    });
    state.tracks = tracks;
    filterTracks();
    renderTrackList();
  } finally {
    hideLoading();
  }
};

// ─── Waveform seek ────────────────────────────────────────────

const seekFromCanvasClick = (e: MouseEvent, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const newTime = ratio * state.duration;
  audioEl.currentTime = newTime;
  state.currentTime = newTime;
  drawWaveform();
};

// ─── Event bindings ───────────────────────────────────────────

// Navigation
elNavLibrary.addEventListener("click", () => showView("library"));
elNavSettings.addEventListener("click", () => showView("settings"));
elEmptyGotoSettings.addEventListener("click", () => showView("settings"));

// Now playing expand / collapse
const expandHandlers = [elNpBarExpand, elNpBarTitle, elNpBarArtist];
expandHandlers.forEach((el) => el.addEventListener("click", (e) => {
  e.stopPropagation();
  expandNowPlaying();
}));

elNpBackBtn.addEventListener("click", collapseNowPlaying);

// Playback controls (bar)
elNpBarPlayBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePlayPause(); });
elNpBarPrevBtn.addEventListener("click", (e) => { e.stopPropagation(); playPrev(); });
elNpBarNextBtn.addEventListener("click", (e) => { e.stopPropagation(); playNext(); });

// Playback controls (expanded)
elNpPlayBtn.addEventListener("click", togglePlayPause);
elNpPrevBtn.addEventListener("click", playPrev);
elNpNextBtn.addEventListener("click", playNext);

// Volume
elNpVolume.addEventListener("input", () => {
  state.volume = parseFloat(elNpVolume.value);
  audioEl.volume = state.volume;
  elSettingsVolume.value = elNpVolume.value;
});

elSettingsVolume.addEventListener("input", () => {
  state.volume = parseFloat(elSettingsVolume.value);
  audioEl.volume = state.volume;
  elNpVolume.value = elSettingsVolume.value;
});

// Waveform seek
elNpWaveformCanvas.addEventListener("click", (e) =>
  seekFromCanvasClick(e, elNpWaveformCanvas)
);
elNpBarWaveform.addEventListener("click", (e) => {
  e.stopPropagation();
  seekFromCanvasClick(e, elNpBarWaveform);
});

// Search
elSearchInput.addEventListener("input", () => {
  state.searchQuery = elSearchInput.value;
  renderTrackList();
  hideLoading();
});

// Settings – add folder
elAddFolderBtn.addEventListener("click", addFolder);

// ─── Init ─────────────────────────────────────────────────────

const init = async () => {
  showLoading();

  try {
    // Get audio server port and settings in parallel
    const [port, settings] = await Promise.all([
      rpc.request.getAudioPort(),
      rpc.request.getSettings(),
    ]);

    state.audioPort = port;
    state.settings = settings;
    state.volume = settings.volume ?? 1;
    audioEl.volume = state.volume;
    elNpVolume.value = String(state.volume);
    elSettingsVolume.value = String(state.volume);

    renderFolderList();

    // Kick off library scan
    if (settings.folders.length > 0) {
      await triggerScan();
    } else {
      hideLoading();
    }
  } catch (err) {
    console.error("[aueio] init error:", err);
    hideLoading();
  }
};

init();

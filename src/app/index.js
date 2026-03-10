// node_modules/electrobun/dist/api/shared/rpc.ts
var MAX_ID = 10000000000;
var DEFAULT_MAX_REQUEST_TIME = 1000;
function missingTransportMethodError(methods, action) {
  const methodsString = methods.map((m) => `"${m}"`).join(", ");
  return new Error(`This RPC instance cannot ${action} because the transport did not provide one or more of these methods: ${methodsString}`);
}
function createRPC(options = {}) {
  let debugHooks = {};
  let transport = {};
  let requestHandler = undefined;
  function setTransport(newTransport) {
    if (transport.unregisterHandler)
      transport.unregisterHandler();
    transport = newTransport;
    transport.registerHandler?.(handler);
  }
  function setRequestHandler(h) {
    if (typeof h === "function") {
      requestHandler = h;
      return;
    }
    requestHandler = (method, params) => {
      const handlerFn = h[method];
      if (handlerFn)
        return handlerFn(params);
      const fallbackHandler = h._;
      if (!fallbackHandler)
        throw new Error(`The requested method has no handler: ${String(method)}`);
      return fallbackHandler(method, params);
    };
  }
  const { maxRequestTime = DEFAULT_MAX_REQUEST_TIME } = options;
  if (options.transport)
    setTransport(options.transport);
  if (options.requestHandler)
    setRequestHandler(options.requestHandler);
  if (options._debugHooks)
    debugHooks = options._debugHooks;
  let lastRequestId = 0;
  function getRequestId() {
    if (lastRequestId <= MAX_ID)
      return ++lastRequestId;
    return lastRequestId = 0;
  }
  const requestListeners = new Map;
  const requestTimeouts = new Map;
  function requestFn(method, ...args) {
    const params = args[0];
    return new Promise((resolve, reject) => {
      if (!transport.send)
        throw missingTransportMethodError(["send"], "make requests");
      const requestId = getRequestId();
      const request2 = {
        type: "request",
        id: requestId,
        method,
        params
      };
      requestListeners.set(requestId, { resolve, reject });
      if (maxRequestTime !== Infinity)
        requestTimeouts.set(requestId, setTimeout(() => {
          requestTimeouts.delete(requestId);
          reject(new Error("RPC request timed out."));
        }, maxRequestTime));
      debugHooks.onSend?.(request2);
      transport.send(request2);
    });
  }
  const request = new Proxy(requestFn, {
    get: (target, prop, receiver) => {
      if (prop in target)
        return Reflect.get(target, prop, receiver);
      return (params) => requestFn(prop, params);
    }
  });
  const requestProxy = request;
  function sendFn(message, ...args) {
    const payload = args[0];
    if (!transport.send)
      throw missingTransportMethodError(["send"], "send messages");
    const rpcMessage = {
      type: "message",
      id: message,
      payload
    };
    debugHooks.onSend?.(rpcMessage);
    transport.send(rpcMessage);
  }
  const send = new Proxy(sendFn, {
    get: (target, prop, receiver) => {
      if (prop in target)
        return Reflect.get(target, prop, receiver);
      return (payload) => sendFn(prop, payload);
    }
  });
  const sendProxy = send;
  const messageListeners = new Map;
  const wildcardMessageListeners = new Set;
  function addMessageListener(message, listener) {
    if (!transport.registerHandler)
      throw missingTransportMethodError(["registerHandler"], "register message listeners");
    if (message === "*") {
      wildcardMessageListeners.add(listener);
      return;
    }
    if (!messageListeners.has(message))
      messageListeners.set(message, new Set);
    messageListeners.get(message).add(listener);
  }
  function removeMessageListener(message, listener) {
    if (message === "*") {
      wildcardMessageListeners.delete(listener);
      return;
    }
    messageListeners.get(message)?.delete(listener);
    if (messageListeners.get(message)?.size === 0)
      messageListeners.delete(message);
  }
  async function handler(message) {
    debugHooks.onReceive?.(message);
    if (!("type" in message))
      throw new Error("Message does not contain a type.");
    if (message.type === "request") {
      if (!transport.send || !requestHandler)
        throw missingTransportMethodError(["send", "requestHandler"], "handle requests");
      const { id, method, params } = message;
      let response;
      try {
        response = {
          type: "response",
          id,
          success: true,
          payload: await requestHandler(method, params)
        };
      } catch (error) {
        if (!(error instanceof Error))
          throw error;
        response = {
          type: "response",
          id,
          success: false,
          error: error.message
        };
      }
      debugHooks.onSend?.(response);
      transport.send(response);
      return;
    }
    if (message.type === "response") {
      const timeout = requestTimeouts.get(message.id);
      if (timeout != null)
        clearTimeout(timeout);
      const { resolve, reject } = requestListeners.get(message.id) ?? {};
      if (!message.success)
        reject?.(new Error(message.error));
      else
        resolve?.(message.payload);
      return;
    }
    if (message.type === "message") {
      for (const listener of wildcardMessageListeners)
        listener(message.id, message.payload);
      const listeners = messageListeners.get(message.id);
      if (!listeners)
        return;
      for (const listener of listeners)
        listener(message.payload);
      return;
    }
    throw new Error(`Unexpected RPC message type: ${message.type}`);
  }
  const proxy = { send: sendProxy, request: requestProxy };
  return {
    setTransport,
    setRequestHandler,
    request,
    requestProxy,
    send,
    sendProxy,
    addMessageListener,
    removeMessageListener,
    proxy
  };
}
function defineElectrobunRPC(_side, config) {
  const rpcOptions = {
    maxRequestTime: config.maxRequestTime,
    requestHandler: {
      ...config.handlers.requests,
      ...config.extraRequestHandlers
    },
    transport: {
      registerHandler: () => {}
    }
  };
  const rpc = createRPC(rpcOptions);
  const messageHandlers = config.handlers.messages;
  if (messageHandlers) {
    rpc.addMessageListener("*", (messageName, payload) => {
      const globalHandler = messageHandlers["*"];
      if (globalHandler) {
        globalHandler(messageName, payload);
      }
      const messageHandler = messageHandlers[messageName];
      if (messageHandler) {
        messageHandler(payload);
      }
    });
  }
  return rpc;
}

// node_modules/electrobun/dist/api/browser/index.ts
var WEBVIEW_ID = window.__electrobunWebviewId;
var RPC_SOCKET_PORT = window.__electrobunRpcSocketPort;

class Electroview {
  bunSocket;
  rpc;
  rpcHandler;
  constructor(config) {
    this.rpc = config.rpc;
    this.init();
  }
  init() {
    this.initSocketToBun();
    window.__electrobun.receiveMessageFromBun = this.receiveMessageFromBun.bind(this);
    if (this.rpc) {
      this.rpc.setTransport(this.createTransport());
    }
  }
  initSocketToBun() {
    const socket = new WebSocket(`ws://localhost:${RPC_SOCKET_PORT}/socket?webviewId=${WEBVIEW_ID}`);
    this.bunSocket = socket;
    socket.addEventListener("open", () => {});
    socket.addEventListener("message", async (event) => {
      const message = event.data;
      if (typeof message === "string") {
        try {
          const encryptedPacket = JSON.parse(message);
          const decrypted = await window.__electrobun_decrypt(encryptedPacket.encryptedData, encryptedPacket.iv, encryptedPacket.tag);
          this.rpcHandler?.(JSON.parse(decrypted));
        } catch (err) {
          console.error("Error parsing bun message:", err);
        }
      } else if (message instanceof Blob) {} else {
        console.error("UNKNOWN DATA TYPE RECEIVED:", event.data);
      }
    });
    socket.addEventListener("error", (event) => {
      console.error("Socket error:", event);
    });
    socket.addEventListener("close", (_event) => {});
  }
  createTransport() {
    const that = this;
    return {
      send(message) {
        try {
          const messageString = JSON.stringify(message);
          that.bunBridge(messageString);
        } catch (error) {
          console.error("bun: failed to serialize message to webview", error);
        }
      },
      registerHandler(handler) {
        that.rpcHandler = handler;
      }
    };
  }
  async bunBridge(msg) {
    if (this.bunSocket?.readyState === WebSocket.OPEN) {
      try {
        const { encryptedData, iv, tag } = await window.__electrobun_encrypt(msg);
        const encryptedPacket = {
          encryptedData,
          iv,
          tag
        };
        const encryptedPacketString = JSON.stringify(encryptedPacket);
        this.bunSocket.send(encryptedPacketString);
        return;
      } catch (error) {
        console.error("Error sending message to bun via socket:", error);
      }
    }
    window.__electrobunBunBridge?.postMessage(msg);
  }
  receiveMessageFromBun(msg) {
    if (this.rpcHandler) {
      this.rpcHandler(msg);
    }
  }
  static defineRPC(config) {
    return defineElectrobunRPC("webview", {
      ...config,
      extraRequestHandlers: {
        evaluateJavascriptWithResponse: ({ script }) => {
          return new Promise((resolve) => {
            try {
              const resultFunction = new Function(script);
              const result = resultFunction();
              if (result instanceof Promise) {
                result.then((resolvedResult) => {
                  resolve(resolvedResult);
                }).catch((error) => {
                  console.error("bun: async script execution failed", error);
                  resolve(String(error));
                });
              } else {
                resolve(result);
              }
            } catch (error) {
              console.error("bun: failed to eval script", error);
              resolve(String(error));
            }
          });
        }
      }
    });
  }
}

// src/app/index.ts
var rpc = Electroview.defineRPC({
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
      }
    }
  }
});
new Electroview({ rpc });
var state = {
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
  searchQuery: ""
};
var audioEl = new Audio;
audioEl.preload = "metadata";
var audioCtx = null;
var analyserNode = null;
var sourceNode = null;
var ensureAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new AudioContext;
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    sourceNode = audioCtx.createMediaElementSource(audioEl);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);
  }
};
var $ = (id) => document.getElementById(id);
var elLibraryView = $("library-view");
var elSettingsView = $("settings-view");
var elNowPlayingView = $("now-playing-view");
var elNowPlayingBar = $("now-playing-bar");
var elTrackList = $("track-list");
var elLoadingOverlay = $("loading-overlay");
var elLibraryEmpty = $("library-empty");
var elTrackCount = $("track-count");
var elSearchInput = $("search-input");
var elFolderList = $("folder-list");
var elAddFolderBtn = $("add-folder-btn");
var elNavLibrary = $("nav-library");
var elNavSettings = $("nav-settings");
var elEmptyGotoSettings = $("empty-goto-settings");
var elNpBarTitle = $("np-bar-title");
var elNpBarArtist = $("np-bar-artist");
var elNpBarAlbumIcon = $("np-bar-album-icon");
var elNpBarExpand = $("np-bar-expand");
var elNpBarPlayBtn = $("np-bar-play-btn");
var elNpBarPrevBtn = $("np-bar-prev-btn");
var elNpBarNextBtn = $("np-bar-next-btn");
var elNpBarWaveform = $("np-bar-waveform");
var elNpBg = $("np-bg");
var elNpBgColor = $("np-bg-color");
var elNpBackBtn = $("np-back-btn");
var elNpTitle = $("np-title");
var elNpArtist = $("np-artist");
var elNpAlbumArtTitle = $("np-album-art-title");
var elNpAlbumArt = $("np-album-art");
var elNpWaveformCanvas = $("np-waveform-canvas");
var elNpCurrentTime = $("np-current-time");
var elNpDuration = $("np-duration");
var elNpPlayBtn = $("np-play-btn");
var elNpPrevBtn = $("np-prev-btn");
var elNpNextBtn = $("np-next-btn");
var elNpVolume = $("np-volume");
var elNpWaveformContainer = $("np-waveform-container");
var elSettingsVolume = $("settings-volume");
var formatTime = (secs) => {
  if (!isFinite(secs) || secs < 0)
    return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
var currentTrack = () => state.currentTrackIndex >= 0 ? state.filteredTracks[state.currentTrackIndex] ?? null : null;
var showView = (view) => {
  state.activeView = view;
  elLibraryView.classList.toggle("active", view === "library");
  elSettingsView.classList.toggle("active", view === "settings");
  elNavLibrary.classList.toggle("active", view === "library");
  elNavSettings.classList.toggle("active", view === "settings");
};
var expandNowPlaying = () => {
  state.isNowPlayingExpanded = true;
  elNowPlayingView.classList.add("active");
  renderNowPlayingExpanded();
};
var collapseNowPlaying = () => {
  state.isNowPlayingExpanded = false;
  elNowPlayingView.classList.remove("active");
};
var showLoading = () => {
  elLoadingOverlay.removeAttribute("hidden");
  elTrackList.setAttribute("hidden", "");
  elLibraryEmpty.setAttribute("hidden", "");
};
var hideLoading = () => {
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
var filterTracks = () => {
  const q = state.searchQuery.toLowerCase().trim();
  state.filteredTracks = q ? state.tracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)) : [...state.tracks];
};
var renderTrackList = () => {
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
var buildTrackItem = (track, idx) => {
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
var getTrackEmoji = (track) => {
  const ext = track.path.split(".").pop()?.toLowerCase() ?? "";
  const emojiMap = {
    mp3: "\uD83C\uDFB5",
    flac: "\uD83C\uDFBC",
    wav: "\uD83D\uDD0A",
    m4a: "\uD83C\uDFB6",
    ogg: "\uD83C\uDFB5",
    aac: "\uD83C\uDFB5",
    opus: "\uD83C\uDFB5",
    wma: "\uD83C\uDFB5"
  };
  return emojiMap[ext] ?? "\uD83C\uDFB5";
};
var escapeHtml = (str) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var buildAudioUrl = (path) => `http://localhost:${state.audioPort}/audio?p=${encodeURIComponent(path)}`;
var playTrack = async (idx) => {
  const track = state.filteredTracks[idx];
  if (!track)
    return;
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
var togglePlayPause = async () => {
  if (!currentTrack())
    return;
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
var playNext = () => {
  if (!state.filteredTracks.length)
    return;
  const next = (state.currentTrackIndex + 1) % state.filteredTracks.length;
  playTrack(next);
};
var playPrev = () => {
  if (!state.filteredTracks.length)
    return;
  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }
  const prev = (state.currentTrackIndex - 1 + state.filteredTracks.length) % state.filteredTracks.length;
  playTrack(prev);
};
var loadWaveform = async (path) => {
  if (!state.audioPort)
    return;
  try {
    const url = buildAudioUrl(path);
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const ctx = audioCtx ?? new AudioContext;
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    const channelData = audioBuf.getChannelData(0);
    const samples = 200;
    const blockSize = Math.floor(channelData.length / samples);
    const waveform = new Float32Array(samples);
    for (let i = 0;i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0;j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] ?? 0);
      }
      waveform[i] = sum / blockSize;
    }
    const max = Math.max(...Array.from(waveform), 0.001);
    for (let i = 0;i < waveform.length; i++) {
      waveform[i] = (waveform[i] ?? 0) / max;
    }
    state.waveformData = waveform;
    drawWaveform();
  } catch (err) {
    console.warn("[aueio] waveform load failed:", err);
    state.waveformData = new Float32Array(200).fill(0.3);
    drawWaveform();
  }
};
var drawWaveform = () => {
  drawWaveformToCanvas(elNpWaveformCanvas, true);
  drawWaveformToCanvas(elNpBarWaveform, false);
};
var drawWaveformToCanvas = (canvas, showProgress) => {
  const waveform = state.waveformData;
  if (!waveform)
    return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = rect.width || canvas.offsetWidth || 400;
  const h = rect.height || canvas.offsetHeight || 80;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  const progress = state.duration > 0 ? state.currentTime / state.duration : 0;
  const progressX = progress * w;
  const barW = w / waveform.length;
  const gap = Math.max(1, barW * 0.15);
  const barActual = barW - gap;
  for (let i = 0;i < waveform.length; i++) {
    const amp = waveform[i] ?? 0;
    const barH = Math.max(2, amp * h * 0.85);
    const x = i * barW;
    const y = (h - barH) / 2;
    const isPast = showProgress && x + barActual < progressX;
    const isCurrent = showProgress && x <= progressX && x + barActual >= progressX;
    if (isPast) {
      ctx.fillStyle = "#3a86ff";
    } else if (isCurrent) {
      ctx.fillStyle = "#ff5500";
    } else {
      ctx.fillStyle = showProgress ? "rgba(255,255,255,0.15)" : "rgba(58,134,255,0.4)";
    }
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(1, barActual), barH, 1.5);
    ctx.fill();
  }
};
var updatePlaybackUI = () => {
  const track = currentTrack();
  const playIcon = state.isPlaying ? "⏸" : "▶";
  if (track) {
    elNowPlayingBar.removeAttribute("hidden");
    elNpBarTitle.textContent = track.title;
    elNpBarArtist.textContent = track.artist;
    elNpBarAlbumIcon.textContent = getTrackEmoji(track);
    const color = track.coverColor ?? "hsl(220,60%,40%)";
    elNpBarAlbumIcon.parentElement.style.background = color;
  } else {
    elNowPlayingBar.setAttribute("hidden", "");
  }
  elNpBarPlayBtn.textContent = playIcon;
  elNpPlayBtn.textContent = playIcon;
  renderNowPlayingExpanded();
};
var renderNowPlayingExpanded = () => {
  const track = currentTrack();
  if (!track)
    return;
  elNpTitle.textContent = track.title;
  elNpArtist.textContent = track.artist;
  elNpAlbumArtTitle.textContent = getTrackEmoji(track);
  const color = track.coverColor ?? "hsl(220,60%,40%)";
  elNpAlbumArt.style.background = color;
  elNpBgColor.style.background = color;
  elNpBg.style.background = color;
  elNpAlbumArt.classList.toggle("playing", state.isPlaying);
};
audioEl.addEventListener("timeupdate", () => {
  state.currentTime = audioEl.currentTime;
  state.duration = audioEl.duration || 0;
  elNpCurrentTime.textContent = formatTime(state.currentTime);
  elNpDuration.textContent = formatTime(state.duration);
  elNpWaveformContainer.setAttribute("aria-valuenow", String(Math.round(state.currentTime / (state.duration || 1) * 100)));
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
  const track = currentTrack();
  if (track) {
    track.duration = audioEl.duration;
    renderTrackList();
  }
});
var renderFolderList = () => {
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
      <span class="folder-icon">\uD83D\uDCC1</span>
      <span class="folder-path" title="${escapeHtml(folder)}">${escapeHtml(folder)}</span>
      <button class="folder-remove-btn" aria-label="Remove folder" data-idx="${idx}">×</button>
    `;
    item.querySelector(".folder-remove-btn")?.addEventListener("click", () => {
      removeFolder(idx);
    });
    elFolderList.appendChild(item);
  });
};
var removeFolder = async (idx) => {
  const updated = { ...state.settings };
  updated.folders = updated.folders.filter((_, i) => i !== idx);
  state.settings = updated;
  await rpc.request.saveSettings(updated);
  renderFolderList();
  triggerScan();
};
var addFolder = async () => {
  const picked = await rpc.request.pickFolder();
  if (!picked)
    return;
  if (state.settings.folders.includes(picked))
    return;
  const updated = {
    ...state.settings,
    folders: [...state.settings.folders, picked]
  };
  state.settings = updated;
  await rpc.request.saveSettings(updated);
  renderFolderList();
  triggerScan();
};
var triggerScan = async () => {
  if (!state.settings.folders.length) {
    state.tracks = [];
    state.filteredTracks = [];
    hideLoading();
    return;
  }
  showLoading();
  try {
    const tracks = await rpc.request.scanLibrary({
      folders: state.settings.folders
    });
    state.tracks = tracks;
    filterTracks();
    renderTrackList();
  } finally {
    hideLoading();
  }
};
var seekFromCanvasClick = (e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  const newTime = ratio * state.duration;
  audioEl.currentTime = newTime;
  state.currentTime = newTime;
  drawWaveform();
};
elNavLibrary.addEventListener("click", () => showView("library"));
elNavSettings.addEventListener("click", () => showView("settings"));
elEmptyGotoSettings.addEventListener("click", () => showView("settings"));
var expandHandlers = [elNpBarExpand, elNpBarTitle, elNpBarArtist];
expandHandlers.forEach((el) => el.addEventListener("click", (e) => {
  e.stopPropagation();
  expandNowPlaying();
}));
elNpBackBtn.addEventListener("click", collapseNowPlaying);
elNpBarPlayBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePlayPause();
});
elNpBarPrevBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  playPrev();
});
elNpBarNextBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  playNext();
});
elNpPlayBtn.addEventListener("click", togglePlayPause);
elNpPrevBtn.addEventListener("click", playPrev);
elNpNextBtn.addEventListener("click", playNext);
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
elNpWaveformCanvas.addEventListener("click", (e) => seekFromCanvasClick(e, elNpWaveformCanvas));
elNpBarWaveform.addEventListener("click", (e) => {
  e.stopPropagation();
  seekFromCanvasClick(e, elNpBarWaveform);
});
elSearchInput.addEventListener("input", () => {
  state.searchQuery = elSearchInput.value;
  renderTrackList();
  hideLoading();
});
elAddFolderBtn.addEventListener("click", addFolder);
var init = async () => {
  showLoading();
  try {
    const [port, settings] = await Promise.all([
      rpc.request.getAudioPort(),
      rpc.request.getSettings()
    ]);
    state.audioPort = port;
    state.settings = settings;
    state.volume = settings.volume ?? 1;
    audioEl.volume = state.volume;
    elNpVolume.value = String(state.volume);
    elSettingsVolume.value = String(state.volume);
    renderFolderList();
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

# Music analysis

The chord/key/tempo/waveform pipeline runs entirely in the webview — there is
no native analyser and no dependency tree beyond `fft.ts`'s hand-rolled DFT.
It exists to feed the now-playing "analysis" view: a chord lane, a one-line
key/tempo/meter caption, and the seek-bar waveform.

## Pipeline

```
track starts (player/engineStarted)
  → effects/analysis.ts: gateway.getAnalysis(id, mtimeMs, ANALYSIS_VERSION)
      hit  → dispatch player/analysisReceived, done
      miss → dispatch player/analysisPending
             → services/analysis/client.ts: analyze(id, mediaUrl, signal)
                 1. fetch(url) → ArrayBuffer
                 2. AudioContext.decodeAudioData (native, off main thread)
                 3. downmix to mono Float32Array (average of all channels)
                 4. postMessage({id, mono, sampleRate, duration}, [mono.buffer])
                    to analysis.worker.ts — the buffer is transferred, not copied
             → worker replies, in order:
                 a. { type: 'peaks', bars: Float32Array(400) }   (< 50 ms budget)
                 b. { type: 'analysis', analysis: AnalysisJSON } (~1-1.5 s budget)
             → client yields each as an AnalysisEvent; the effect dispatches
               player/waveformReceived then player/analysisReceived, and
               calls gateway.putAnalysis(id, mtimeMs, analysis) to cache it
```

Inside the worker (`services/analysis/analyze.ts`, called from
`analysis.worker.ts`):

| Stage | Method | Budget (§9) |
|---|---|---|
| Peaks (400 bars) | Per-bar RMS over the mono signal, normalised to `[0.07, 1]` (`peaks.ts`) | < 50 ms |
| Chroma | STFT, FFT size 4096, hop 2048, Hann window, bins folded into 12 pitch classes over 55–4200 Hz, each frame L2-normalised (`chroma.ts`) | ~1 s / 5 min track |
| Key | Krumhansl–Schmuckler: mean chroma correlated against 24 rotated major/minor tone profiles (Krumhansl & Kessler 1982); `confidence` = margin between best and second-best match (`key.ts`) | trivial |
| Chords | 24 major/minor triad templates matched per 0.5 s window, 5-window median filter, merged into runs, labelled with sharps only (`chords.ts`) | trivial |
| Tempo | Spectral-flux onset envelope (FFT 1024, hop 512), autocorrelated over 60–200 BPM, peak refined by parabolic interpolation (`tempo.ts`) | ~0.5 s |
| Meter | Not computed by the worker — deferred, per the migration plan §9 | — |

`fft.ts` provides the shared `fft`/`hannWindow` primitives `chroma.ts` and
`tempo.ts` both build on.

## Caching

Results are cached in the `track_analysis` SQLite table
(`src/main/db/schema.ts`), keyed by `track_id` with `source_mtime_ms` and
`version` columns:

```sql
CREATE TABLE track_analysis (
  track_id TEXT PRIMARY KEY,
  source_mtime_ms INTEGER NOT NULL,
  version INTEGER NOT NULL,
  json TEXT NOT NULL
);
```

A cache hit requires all three of `track_id`, `mtimeMs` and
`ANALYSIS_VERSION` (`src/shared/constants.ts`, currently `1`) to match what
the RPC call passed — an edited file (new `mtime_ms` from a rescan) or a
bumped `ANALYSIS_VERSION` (after changing an algorithm) invalidates the
cache and forces recomputation. A `DELETE ... ON tracks` trigger removes the
row when its track is pruned from the library, so analysis never outlives
the track it describes.

## Preemption

`services/analysis/client.ts`'s `analyze()` call and `effects/analysis.ts`'s
`AbortController` both key off track identity: switching tracks aborts
whatever the previous `analyze()` call was still doing (`signal.aborted`
checks between every yielded event, and around the cache lookup) before
starting the new one, so a slow chroma pass on a track the listener already
skipped past never overwrites the current track's state. The worker itself
holds no state across requests — it is a stateless request/reply relay; all
preemption logic lives in `client.ts`/the effect, one call site.

## Failure surfacing

- A `getAnalysis` RPC failure is treated as a cache miss (falls through to
  recomputation), not a hard error.
- A decode or worker failure that isn't due to preemption dispatches
  `player/analysisFailed` with a string `error` message
  (`errorMessage(error)` unwraps `Error#message`, falls back to `String()`).
  The reducer/UI surface this as the analysis view's failure state rather
  than an unplayable track — playback is unaffected, only the chord
  lane/readout degrade.
- A decode or fetch failure that produces neither peaks nor analysis leaves
  the waveform empty; it is distinct from `Track.isUnplayable`, which is set
  when the `<audio>` element itself cannot play the file (see the WebKit
  codec caveat in `AGENTS.md`).

import { readdir, stat } from "fs/promises";
import { join, extname, basename } from "path";
import type { Track } from "./rpc";

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".m4a",
  ".flac",
  ".wav",
  ".ogg",
  ".aac",
  ".opus",
  ".webm",
  ".wma",
  ".aiff",
  ".aif",
]);

const generateCoverColor = (title: string): string => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 40%)`;
};

const parseBasicMeta = (
  filePath: string,
  size: number
): Omit<Track, "path" | "id"> => {
  const filename = basename(filePath);
  const noExt = basename(filePath, extname(filePath));

  // Try to parse "Artist - Title" pattern
  const dashIdx = noExt.indexOf(" - ");
  let artist = "Unknown Artist";
  let title = noExt;

  if (dashIdx > 0) {
    artist = noExt.slice(0, dashIdx).trim();
    title = noExt.slice(dashIdx + 3).trim();
  }

  // Strip leading track numbers like "01 ", "01. "
  title = title.replace(/^\d+\.?\s+/, "");

  return {
    title,
    artist,
    album: "Unknown Album",
    duration: 0,
    size,
    coverColor: generateCoverColor(filename),
  };
};

export const scanLibrary = async (folders: string[]): Promise<Track[]> => {
  const tracks: Track[] = [];
  const seen = new Set<string>();

  const walk = async (dir: string): Promise<void> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (
            entry.isFile() &&
            AUDIO_EXTENSIONS.has(extname(entry.name).toLowerCase()) &&
            !seen.has(fullPath)
          ) {
            seen.add(fullPath);
            try {
              const stats = await stat(fullPath);
              const meta = parseBasicMeta(fullPath, stats.size);
              tracks.push({ id: fullPath, path: fullPath, ...meta });
            } catch {
              // skip unreadable files
            }
          }
        })
      );
    } catch {
      // skip inaccessible directories
    }
  };

  await Promise.all(folders.map(walk));
  tracks.sort((a, b) => a.title.localeCompare(b.title));
  return tracks;
};

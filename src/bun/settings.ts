import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import type { AppSettings } from "./rpc";

const CONFIG_DIR = join(homedir(), ".config", "aueio-player");
const SETTINGS_FILE = join(CONFIG_DIR, "settings.json");

const getDefaultFolders = (): string[] => {
  const candidates = [
    join(homedir(), "Music"),
    join(homedir(), "music"),
    join(homedir(), "Audio"),
    join(homedir(), "audio"),
    join(homedir(), "Downloads"),
  ];
  return candidates.filter((f) => existsSync(f));
};

export const DEFAULT_SETTINGS: AppSettings = {
  folders: getDefaultFolders(),
  volume: 1.0,
};

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const text = await Bun.file(SETTINGS_FILE).text();
    const parsed = JSON.parse(text) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      folders: Array.isArray(parsed.folders)
        ? parsed.folders
        : DEFAULT_SETTINGS.folders,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  await mkdir(CONFIG_DIR, { recursive: true });
  await Bun.write(SETTINGS_FILE, JSON.stringify(settings, null, 2));
};

export { getDefaultFolders };

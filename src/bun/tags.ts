import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import type { TrackTagOverrides } from "./rpc";

const CONFIG_DIR = join(homedir(), ".config", "aueio-player");
const TAGS_FILE = join(CONFIG_DIR, "tags.json");

export type TagsStore = Record<string, TrackTagOverrides>;

export const loadTags = async (): Promise<TagsStore> => {
  try {
    const text = await Bun.file(TAGS_FILE).text();
    return JSON.parse(text) as TagsStore;
  } catch {
    return {};
  }
};

export const saveTag = async (id: string, tags: TrackTagOverrides): Promise<void> => {
  await mkdir(CONFIG_DIR, { recursive: true });
  const store = await loadTags();
  store[id] = { ...store[id], ...tags };
  await Bun.write(TAGS_FILE, JSON.stringify(store, null, 2));
};

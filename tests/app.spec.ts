import { test, expect, chromium } from "@playwright/test";
import { join } from "path";
import { createServer, type Server } from "http";
import { createReadStream, existsSync } from "fs";
import { extname } from "path";

// ─── Local HTTP server (avoids file:// CORS issues with ES modules) ─────────

const APP_DIR = join(process.cwd(), "src/app");
let server: Server;
let serverPort = 0;

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const startServer = (): Promise<number> =>
  new Promise((resolve, reject) => {
    server = createServer((req, res) => {
      const raw = req.url ?? "/";
      const safePath = raw.split("?")[0] ?? "/";
      const file = join(APP_DIR, safePath === "/" ? "index.html" : safePath);
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ct = MIME[extname(file)] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": ct });
      createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve(port);
    });
    server.on("error", reject);
  });

// ─── RPC stub injected before any page scripts run ──────────────────────────

const RPC_STUB = `
  window.__electrobunWebviewId = 1;
  window.__electrobunRpcSocketPort = 59999;
  window.__electrobun = { receiveMessageFromBun: () => {} };
  window.__electrobun_encrypt = async (msg) => ({ encryptedData: msg, iv: 'iv', tag: 'tag' });
  window.__electrobun_decrypt = async (data) => data;
  window.__electrobunBunBridge = { postMessage: () => {} };

  // Intercept RPC requests so they resolve immediately (no bun process running)
  const _origWebSocket = window.WebSocket;
  window.WebSocket = class MockWS {
    constructor(url) { this.url = url; this.readyState = 0; setTimeout(() => { this.readyState = 3; this.onerror?.({type:'error'}); }, 50); }
    addEventListener(ev, fn) { if (ev === 'error') this.onerror = fn; }
    send() {}
    close() {}
  };
`;

// ─── Test suite ──────────────────────────────────────────────────────────────

test.describe("Aüeio Player UI", () => {
  let page: any;
  let browser: any;
  let ctx: any;

  test.beforeAll(async () => {
    serverPort = await startServer();

    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: existsSync(
        "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome"
      )
        ? "/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome"
        : undefined,
    });
    ctx = await browser.newContext();
    page = await ctx.newPage();

    await page.addInitScript(RPC_STUB);
    await page.goto(`http://127.0.0.1:${serverPort}/`, {
      waitUntil: "networkidle",
    });

    // Wait for app to fully initialise (RPC will time out quickly with the mock WS)
    await page.waitForTimeout(2000);
  });

  test.afterAll(async () => {
    await browser.close();
    server.close();
  });

  // ── Layout & navigation ──────────────────────────────────────

  test("renders topbar with app title and nav buttons", async () => {
    await expect(page.locator("#topbar")).toBeVisible();
    await expect(page.locator("#app-title")).toBeVisible();
    await expect(page.locator("#nav-library")).toBeVisible();
    await expect(page.locator("#nav-settings")).toBeVisible();
  });

  test("library view is active by default", async () => {
    await expect(page.locator("#library-view")).toHaveClass(/active/);
    await expect(page.locator("#settings-view")).not.toHaveClass(/active/);
  });

  test("clicking Settings nav shows settings view", async () => {
    await page.click("#nav-settings");
    await page.waitForTimeout(100);
    await expect(page.locator("#settings-view")).toHaveClass(/active/);
    await expect(page.locator("#library-view")).not.toHaveClass(/active/);
  });

  test("clicking Library nav switches back", async () => {
    await page.click("#nav-library");
    await page.waitForTimeout(100);
    await expect(page.locator("#library-view")).toHaveClass(/active/);
    await expect(page.locator("#settings-view")).not.toHaveClass(/active/);
  });

  // ── Settings view ────────────────────────────────────────────

  test("settings view has Add Folder button", async () => {
    await page.click("#nav-settings");
    await page.waitForTimeout(100);
    await expect(page.locator("#add-folder-btn")).toBeVisible();
  });

  test("settings view has volume slider", async () => {
    await expect(page.locator("#settings-volume")).toBeVisible();
  });

  test("settings view has folder list section", async () => {
    // folder-list may be empty (zero height) when no folders configured, so use toBeAttached
    await expect(page.locator("#folder-list")).toBeAttached();
  });

  // ── Library view elements ─────────────────────────────────────

  test("library view has search input", async () => {
    await page.click("#nav-library");
    await page.waitForTimeout(100);
    await expect(page.locator("#search-input")).toBeVisible();
  });

  test("library shows loading, empty, or track list state", async () => {
    // One of these states must be visible
    const isLoading = await page.locator("#loading-overlay").isVisible();
    const isEmpty = await page.locator("#library-empty").isVisible();
    const hasTracks = await page.locator("#track-list").isVisible();
    expect(isLoading || isEmpty || hasTracks).toBe(true);
  });

  // ── Now Playing bar ──────────────────────────────────────────

  test("now-playing bar is hidden when no track playing", async () => {
    await expect(page.locator("#now-playing-bar")).toBeHidden();
  });

  // ── Now Playing expanded ─────────────────────────────────────

  test("now-playing expanded view is hidden initially", async () => {
    await expect(page.locator("#now-playing-view")).not.toHaveClass(/active/);
  });

  test("now-playing view has waveform canvas", async () => {
    const el = page.locator("#np-waveform-canvas");
    await expect(el).toBeAttached();
  });

  // ── Accessibility ─────────────────────────────────────────────

  test("nav buttons have accessible text", async () => {
    await expect(page.locator("#nav-library")).toHaveText("Library");
    await expect(page.locator("#nav-settings")).toHaveText("Settings");
  });

  test("search input has aria-label", async () => {
    const label = await page.locator("#search-input").getAttribute("aria-label");
    expect(label).toBeTruthy();
  });

  test("now-playing bar expand button exists with aria-label", async () => {
    const label = await page
      .locator("#np-bar-expand")
      .getAttribute("aria-label");
    expect(label).toBeTruthy();
  });

  test("playback controls exist in expanded view", async () => {
    await expect(page.locator("#np-play-btn")).toBeAttached();
    await expect(page.locator("#np-prev-btn")).toBeAttached();
    await expect(page.locator("#np-next-btn")).toBeAttached();
  });

  // ── Screenshots ───────────────────────────────────────────────

  test("take screenshot of library view", async () => {
    await page.click("#nav-library");
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "tests/screenshots/library-view.png",
      fullPage: false,
    });
  });

  test("take screenshot of settings view", async () => {
    await page.click("#nav-settings");
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "tests/screenshots/settings-view.png",
      fullPage: false,
    });
  });
});

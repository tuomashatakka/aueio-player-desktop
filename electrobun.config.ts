import type { ElectrobunConfig } from "electrobun/bun";

const config: ElectrobunConfig = {
  app: {
    name: "Aüeio Player",
    identifier: "dev.aueio.player",
    version: "0.1.0",
    description: "A beautiful minimal cross-platform audio player",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    views: {
      app: {
        entrypoint: "src/app/index.tsx",
      },
    },
    copy: {
      "src/app/index.html": "views/app/index.html",
      "src/app/styles/main.css": "views/app/styles/main.css",
      "src/app/styles/tokens.css": "views/app/styles/tokens.css",
      "src/app/styles/reset.css": "views/app/styles/reset.css",
      "src/app/styles/base.css": "views/app/styles/base.css",
      "src/app/styles/states.css": "views/app/styles/states.css",
      "src/app/styles/components.css": "views/app/styles/components.css",
      "src/app/styles/utilities.css": "views/app/styles/utilities.css",
      "src/app/styles/ui.css": "views/app/styles/ui.css",
      "src/app/styles/themes.css": "views/app/styles/themes.css",
      "src/app/styles/app.css": "views/app/styles/app.css",
    },
    mac: { bundleCEF: false },
    linux: { bundleCEF: false },
    win: { bundleCEF: false },
  },
};

export default config;

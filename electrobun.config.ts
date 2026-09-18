import type { ElectrobunConfig } from 'electrobun'


export default {
  app: {
    name:       'Aueio Player',
    identifier: 'dev.aueio.player',
    version:    '0.2.0',
  },
  build: {
    mainProcess: 'bun',
    bun:         {
      entrypoint: 'src/main/index.ts',
    },
    views: {
      app: {
        entrypoint: 'src/app/index.tsx',
      },
      analysisWorker: {
        entrypoint: 'src/app/services/analysis/analysis.worker.ts',
      },
    },
    copy: {
      'src/app/index.html': 'views/app/index.html',
      'src/app/styles':     'views/app/styles',
    },
    mac:   { bundleCEF: false },
    linux: { bundleCEF: false },
    win:   { bundleCEF: false },
  },
} satisfies ElectrobunConfig

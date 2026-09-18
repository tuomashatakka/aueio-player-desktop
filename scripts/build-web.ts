/**
 * Builds the app for a plain browser (e2e + screenshots): bundles
 * `index.tsx` and the analysis worker with `Bun.build`, copies the static
 * HTML (rewriting `views://app/` → `./`), the stylesheets and the test
 * fixtures into `build/web`. Mirrors Electrobun's `views.app`/
 * `views.analysisWorker` entrypoints (`electrobun.config.ts`) without an
 * Electrobun runtime.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'


const root   = join(import.meta.dir, '..')
const outDir = join(root, 'build/web')

async function bundle (entrypoint: string, outdir: string): Promise<void> {
  const result = await Bun.build({
    entrypoints: [ join(root, entrypoint) ],
    outdir:      join(outDir, outdir),
    target:      'browser',
    format:      'esm',
    sourcemap:   'linked',
    naming:      'index.js',
  })

  if (!result.success) {
    for (const message of result.logs)
      console.error(message)
    throw new Error(`build failed: ${entrypoint}`)
  }
}

async function writeIndexHtml (): Promise<void> {
  const source    = await readFile(join(root, 'src/app/index.html'), 'utf8')
  const rewritten = source.replaceAll('views://app/', './')

  await writeFile(join(outDir, 'index.html'), rewritten)
}

async function main (): Promise<void> {
  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  await Promise.all([
    bundle('src/app/index.tsx', '.'),
    bundle('src/app/services/analysis/analysis.worker.ts', 'analysisWorker'),
    writeIndexHtml(),
    cp(join(root, 'src/app/styles'), join(outDir, 'styles'), { recursive: true }),
    cp(join(root, 'tests/fixtures'), join(outDir, 'fixtures'), { recursive: true }),
  ])

  console.log(`built → ${outDir}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

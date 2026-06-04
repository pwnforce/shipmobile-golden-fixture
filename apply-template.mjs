#!/usr/bin/env node
// golden-fixture/apply-template.mjs
//
// Generates the golden fixture by applying the REAL engine output to this minimal
// Vite+React+Tailwind app. This guarantees the fixture IS `render()`'s output (T-04-11):
// it cannot silently drift from the engine, because it is produced FROM the engine.
//
// The engine lives in TypeScript under ../lib/template and uses Node CJS globals
// (`__dirname`) + a JSON import to load its android scaffold from disk. Rather than add
// a TS loader dependency, we load it through Vite's SSR module loader (vite is already a
// devDependency of the app repo this lib ships in), which handles TS + JSON + path
// resolution exactly like the test suite does.
//
// Usage: node golden-fixture/apply-template.mjs   (run from the repo root)

import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const fixtureRoot = __dirname

// The fixture's fixed mobile identity. These are the values the engine substitutes into
// capacitor.config.ts and the android/ scaffold (appName -> display name, bundleId ->
// applicationId/namespace/custom_url_scheme). Kept stable so the smoke job can launch by
// a known package id.
const APP_NAME = 'ShipMobile Golden Fixture'
const BUNDLE_ID = 'com.shipmobile.goldenfixture'

function readFixture(rel) {
  return fs.readFileSync(path.join(fixtureRoot, rel), 'utf8')
}

async function loadEngine() {
  // Spin up a throwaway Vite server purely to use ssrLoadModule for TS resolution.
  const server = await createServer({
    root: repoRoot,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  })
  try {
    // Vite's SSR loader evaluates modules as ESM and does not provide the CJS globals
    // `__dirname` / `__filename`. The engine's android.ts resolves its checked-in asset
    // tree via `path.resolve(__dirname, 'assets/android')`, so we expose the engine's
    // own directory as a global before loading. (The only engine module that reads
    // __dirname is lib/template/android.ts, so a single value is correct here.)
    globalThis.__dirname = path.join(repoRoot, 'lib/template')
    globalThis.__filename = path.join(repoRoot, 'lib/template/android.ts')
    const mod = await server.ssrLoadModule(
      path.join(repoRoot, 'lib/template/index.ts'),
    )
    return mod.render
  } finally {
    await server.close()
  }
}

function buildInput() {
  const packageJson = readFixture('package.json')
  const indexHtml = readFixture('index.html')
  const entryContent = readFixture('src/main.tsx')
  return {
    fullName: 'shipmobile/shipmobile-golden-fixture',
    base: '/',
    webDir: 'dist', // Vite's default output dir for this minimal app
    vars: {
      appName: APP_NAME,
      bundleId: BUNDLE_ID,
      brandColor: '#4338ca',
    },
    entryFile: { path: 'src/main.tsx', content: entryContent },
    packageJson,
    indexHtml,
  }
}

function writeEntry(entry) {
  const abs = path.join(fixtureRoot, entry.path)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  if ('base64' in entry) {
    fs.writeFileSync(abs, Buffer.from(entry.base64, 'base64'))
  } else {
    fs.writeFileSync(abs, entry.content, 'utf8')
  }
  if (entry.mode === '100755') {
    fs.chmodSync(abs, 0o755)
  }
}

async function main() {
  const render = await loadEngine()
  const result = render(buildInput())
  if (!result.ok) {
    console.error('render() failed:', result.reason)
    process.exit(1)
  }
  for (const entry of result.files) {
    writeEntry(entry)
  }

  // Append the FIXTURE-ONLY smoke job to the engine's build workflow. The build job above
  // is byte-equivalent to renderWorkflow() (it is the injected workflow); the smoke block
  // is the no-white-screen gate and lives ONLY in the fixture, never in a user's repo.
  const workflowRel = '.github/workflows/android-debug-build.yml'
  const workflowAbs = path.join(fixtureRoot, workflowRel)
  const buildWorkflow = fs.readFileSync(workflowAbs, 'utf8')
  const smokeJob = readFixture('smoke-job.yml')
  const combined = buildWorkflow.replace(/\n+$/, '\n') + smokeJob.replace(/\n+$/, '\n')
  fs.writeFileSync(workflowAbs, combined, 'utf8')

  console.log(
    `Applied ${result.files.length} engine file(s) into golden-fixture/ ` +
      `and appended the fixture-only smoke job to ${workflowRel}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

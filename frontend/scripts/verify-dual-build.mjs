#!/usr/bin/env node
// Repeatable check that `npm run build` produced both a modern ES module bundle and a
// legacy (SystemJS + polyfills) bundle for older browsers. Fails the build if either is
// missing so a regression (e.g. someone removing the legacy plugin) is caught immediately
// instead of surfacing later as "Iterator is not defined" on an old PC in the field.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(import.meta.dirname, '..', 'dist');
const assetsDir = join(distDir, 'assets');
const indexHtmlPath = join(distDir, 'index.html');

function fail(message) {
  console.error(`[verify-dual-build] FAIL: ${message}`);
  process.exit(1);
}

let indexHtml;
try {
  indexHtml = readFileSync(indexHtmlPath, 'utf8');
} catch {
  fail(`dist/index.html not found — run "npm run build" first.`);
}

let assetFiles;
try {
  assetFiles = readdirSync(assetsDir);
} catch {
  fail(`dist/assets not found — run "npm run build" first.`);
}

const modernEntry = assetFiles.find((f) => /^index-.*\.js$/.test(f) && !f.includes('-legacy-'));
const legacyEntry = assetFiles.find((f) => /^index-legacy-.*\.js$/.test(f));
const legacyPolyfills = assetFiles.find((f) => /^polyfills-legacy-.*\.js$/.test(f));

if (!modernEntry) fail('No modern (type="module") entry chunk found in dist/assets.');
if (!legacyEntry) fail('No legacy (nomodule/SystemJS) entry chunk found in dist/assets.');
if (!legacyPolyfills) fail('No legacy polyfills chunk found in dist/assets.');
if (!indexHtml.includes('nomodule')) fail('dist/index.html has no <script nomodule> fallback for legacy browsers.');
if (!indexHtml.includes('type="module"')) fail('dist/index.html has no <script type="module"> entry for modern browsers.');

const modernSize = statSync(join(assetsDir, modernEntry)).size;
const legacySize = statSync(join(assetsDir, legacyEntry)).size;
const polyfillsSize = statSync(join(assetsDir, legacyPolyfills)).size;

console.log('[verify-dual-build] OK — modern and legacy bundles both present.');
console.log(`  modern entry:   ${modernEntry} (${(modernSize / 1024).toFixed(1)} kB)`);
console.log(`  legacy entry:   ${legacyEntry} (${(legacySize / 1024).toFixed(1)} kB)`);
console.log(`  legacy polyfill: ${legacyPolyfills} (${(polyfillsSize / 1024).toFixed(1)} kB)`);

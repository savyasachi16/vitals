#!/usr/bin/env node
// One-shot pipeline: parse export.xml → SQLite → static JSON.
// Usage: node scripts/ingest.js [path-to-export.xml] [--fresh]
//
// Step 1 is the Rust crate at scripts/parse-health-xml/. The first run
// triggers `cargo build --release`; subsequent runs reuse the cached binary.
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const crateDir = join(scriptDir, 'parse-health-xml');
const binary = join(crateDir, 'target', 'release', 'parse-health-xml');

if (!existsSync(binary)) {
  console.log('Building scripts/parse-health-xml (one-time, release profile)...');
  const build = spawnSync('cargo', ['build', '--release', '--manifest-path', join(crateDir, 'Cargo.toml')], {
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const args = process.argv.slice(2);
const parse = spawnSync(binary, args, { stdio: 'inherit' });
if (parse.status !== 0) process.exit(parse.status ?? 1);

const gen = spawnSync('node', [join(scriptDir, 'generate-json.js')], { stdio: 'inherit' });
if (gen.status !== 0) process.exit(gen.status ?? 1);

console.log('\nIngest complete. Run `npm run dev` to view.');

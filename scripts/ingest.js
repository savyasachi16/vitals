#!/usr/bin/env node
// One-shot pipeline: parse export.xml → SQLite → static JSON.
// Usage: node scripts/ingest.js [path-to-export.xml] [--fresh]
import { spawnSync } from 'child_process';

const args = process.argv.slice(2);

const parse = spawnSync('node', ['scripts/parse-health-xml.js', ...args], { stdio: 'inherit' });
if (parse.status !== 0) process.exit(parse.status ?? 1);

const gen = spawnSync('node', ['scripts/generate-json.js'], { stdio: 'inherit' });
if (gen.status !== 0) process.exit(gen.status ?? 1);

console.log('\nIngest complete. Run `npm run dev` to view.');

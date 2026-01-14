#!/usr/bin/env node

/**
 * Run a Cliffy example with hot reloading
 *
 * Usage:
 *   npm run example counter-101
 *   npm run example -- --list
 *   npm run example -- --help
 */

import { spawn } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'examples');

function getExamples() {
  return readdirSync(examplesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => existsSync(join(examplesDir, dirent.name, 'package.json')))
    .map(dirent => dirent.name);
}

function printHelp() {
  console.log(`
Cliffy Example Runner

Usage:
  npm run example <example-name>    Run an example with hot reloading
  npm run example -- --list         List all available examples
  npm run example -- --help         Show this help message

Available examples:
${getExamples().map(e => `  - ${e}`).join('\n')}

Examples:
  npm run example counter-101
`);
}

function listExamples() {
  console.log('\nAvailable examples:\n');
  getExamples().forEach(e => console.log(`  ${e}`));
  console.log('\nRun with: npm run example <name>\n');
}

async function installDeps(exampleDir) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Installing dependencies...`);
    const proc = spawn('npm', ['install'], {
      cwd: exampleDir,
      stdio: 'inherit'
    });
    proc.on('error', reject);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
  });
}

async function runExample(name) {
  const examples = getExamples();

  if (!examples.includes(name)) {
    console.error(`\nError: Example "${name}" not found.\n`);
    listExamples();
    process.exit(1);
  }

  const exampleDir = join(examplesDir, name);

  // Ensure dependencies are installed
  try {
    await installDeps(exampleDir);
  } catch (e) {
    console.error('Failed to install dependencies:', e.message);
    process.exit(1);
  }

  console.log(`\n🚀 Starting ${name} with hot reload...\n`);
  console.log('   [wasm] = Rust/WASM watcher (cargo-watch)');
  console.log('   [vite] = Vite dev server\n');

  // Run with concurrently - using array args to avoid shell injection
  const proc = spawn('npx', [
    'concurrently',
    '-k',
    '-n', 'wasm,vite',
    '-c', 'blue,green',
    'npm run dev:wasm',
    `cd examples/${name} && npm run dev`
  ], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true  // Required for cd && command
  });

  proc.on('error', (err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });

  proc.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
  listExamples();
  process.exit(0);
}

// Validate example name (alphanumeric and hyphens only)
const exampleName = args[0];
if (!/^[a-zA-Z0-9-]+$/.test(exampleName)) {
  console.error('Invalid example name. Use only alphanumeric characters and hyphens.');
  process.exit(1);
}

runExample(exampleName);

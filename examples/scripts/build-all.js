#!/usr/bin/env node

import { execSync } from 'child_process';
import { cpSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = join(__dirname, '..');
const DIST_DIR = join(EXAMPLES_DIR, 'dist');

// TypeScript examples to build (exclude PureScript and shared)
const TYPESCRIPT_EXAMPLES = [
  'tsx-counter',
  'tsx-todo',
  'tsx-forms',
  'whiteboard',
  'design-tool',
  'document-editor',
  'multiplayer-game',
  'crdt-playground',
  'p2p-sync',
  'geometric-transforms',
  'gpu-benchmark',
  'testing-showcase',
];

function run(cmd, cwd = EXAMPLES_DIR, env = {}) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  try {
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    return true;
  } catch (err) {
    console.error(`\x1b[31mCommand failed: ${cmd}\x1b[0m`);
    return false;
  }
}

function main() {
  console.log('\n\x1b[35m=== Cliffy Examples Build ===\x1b[0m\n');

  // Clean previous build
  if (existsSync(DIST_DIR)) {
    console.log('Cleaning previous build...');
    rmSync(DIST_DIR, { recursive: true });
  }
  mkdirSync(DIST_DIR, { recursive: true });

  // Build landing page first
  console.log('\n\x1b[33m=== Building landing page ===\x1b[0m');
  if (!run('npm run build -w landing')) {
    console.error('Failed to build landing page');
    process.exit(1);
  }

  // Copy landing page dist to root
  const landingDist = join(EXAMPLES_DIR, 'landing', 'dist');
  if (existsSync(landingDist)) {
    cpSync(landingDist, DIST_DIR, { recursive: true });
    console.log('Copied landing page to dist/');
  }

  // Track build results
  const results = { success: [], failed: [], skipped: [] };

  // Build each TypeScript example
  for (const example of TYPESCRIPT_EXAMPLES) {
    console.log(`\n\x1b[33m=== Building ${example} ===\x1b[0m`);
    const exampleDir = join(EXAMPLES_DIR, example);

    if (!existsSync(exampleDir)) {
      console.log(`\x1b[90mSkipping ${example} - directory not found\x1b[0m`);
      results.skipped.push(example);
      continue;
    }

    // Check if package.json exists
    if (!existsSync(join(exampleDir, 'package.json'))) {
      console.log(`\x1b[90mSkipping ${example} - no package.json\x1b[0m`);
      results.skipped.push(example);
      continue;
    }

    // Build the example with NETLIFY env for correct base paths
    if (run(`npm run build -w ${example}`, EXAMPLES_DIR, { NETLIFY: 'true' })) {
      // Copy built example to dist/<example>/
      const srcDist = join(exampleDir, 'dist');
      const destDist = join(DIST_DIR, example);

      if (existsSync(srcDist)) {
        cpSync(srcDist, destDist, { recursive: true });
        console.log(`\x1b[32mCopied ${example}/dist to dist/${example}\x1b[0m`);
        results.success.push(example);
      } else {
        console.log(`\x1b[31mNo dist folder found for ${example}\x1b[0m`);
        results.failed.push(example);
      }
    } else {
      results.failed.push(example);
    }
  }

  // Summary
  console.log('\n\x1b[35m=== Build Summary ===\x1b[0m');
  console.log(`\x1b[32mSuccess: ${results.success.length}\x1b[0m - ${results.success.join(', ') || 'none'}`);
  if (results.failed.length > 0) {
    console.log(`\x1b[31mFailed: ${results.failed.length}\x1b[0m - ${results.failed.join(', ')}`);
  }
  if (results.skipped.length > 0) {
    console.log(`\x1b[90mSkipped: ${results.skipped.length}\x1b[0m - ${results.skipped.join(', ')}`);
  }
  console.log(`\nOutput: ${DIST_DIR}`);

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
// Simple wrapper to run the migration script

const { spawn } = require('child_process');
const path = require('path');

const tsNodePath = path.join(__dirname, 'node_modules', '.bin', 'ts-node');
const scriptPath = path.join(__dirname, 'scripts', 'migrate-anime-cartoon-mediaType.ts');

const proc = spawn(tsNodePath, [
  '--transpile-only',
  '--esm',
  scriptPath
], {
  stdio: 'inherit',
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_OPTIONS: '--loader=ts-node/esm'
  }
});

proc.on('exit', (code) => {
  process.exit(code);
});

#!/usr/bin/env node

// Launches the Snake game in a new terminal window when a background task starts.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE = join(tmpdir(), 'claude-snake.pid');
const gamePath = join(__dirname, '..', 'snake.mjs');

// If already running, send SIGUSR2 to reset with countdown
if (existsSync(PID_FILE)) {
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8'));
    process.kill(pid, 0); // throws if process doesn't exist
    process.kill(pid, 'SIGUSR2'); // reset game with countdown
    process.exit(0);
  } catch {
    // stale PID file — continue to launch new instance
  }
}

// Platform-specific terminal launch
if (process.platform === 'darwin') {
  const osaScript = `
    tell application "Terminal"
      activate
      do script "node '${gamePath}'"
    end tell`;
  try {
    execSync(`osascript -e '${osaScript}'`, { stdio: 'ignore' });
  } catch {
    // Terminal.app not available — skip silently
  }
} else if (process.platform === 'linux') {
  const terminals = [
    ['gnome-terminal', '--', 'node', gamePath],
    ['xterm', '-e', `node '${gamePath}'`],
    ['konsole', '-e', `node '${gamePath}'`],
  ];
  for (const [cmd, ...args] of terminals) {
    try {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
      execSync([cmd, ...args].join(' ') + ' &', { stdio: 'ignore' });
      break;
    } catch {
      continue;
    }
  }
}

process.exit(0);

#!/usr/bin/env node

// Launches the Snake game in a new terminal window when a background task starts.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PID_FILE = join(tmpdir(), 'claude-snake.pid');
const PREV_APP_FILE = join(tmpdir(), 'claude-snake-prevapp.txt');
const gamePath = join(__dirname, '..', 'snake.mjs');

// Save the Terminal window ID so we can restore focus to the Claude Code window
if (process.platform === 'darwin') {
  try {
    const windowId = execSync(
      `osascript -e 'tell application "Terminal" to get id of front window'`,
      { encoding: 'utf8' }
    ).trim();
    writeFileSync(PREV_APP_FILE, windowId);
  } catch {}
}

// If already running, send SIGUSR2 to reset with countdown
if (existsSync(PID_FILE)) {
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8'));
    process.kill(pid, 0); // throws if process doesn't exist
    process.kill(pid, 'SIGUSR2'); // reset game with countdown
    // Bring the Terminal window to the front
    if (process.platform === 'darwin') {
      try {
        execSync(`osascript -e 'tell application "Terminal" to activate'`, { stdio: 'ignore' });
      } catch {}
    }
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
      delay 1
      set font size of window 1 to 18
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

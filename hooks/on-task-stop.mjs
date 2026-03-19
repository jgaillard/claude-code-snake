#!/usr/bin/env node

// Signals the Snake game that the background task finished.
// Sends SIGUSR1 so the game shows a "Task Complete" banner.
// Restores focus to the app that was active before Snake launched.

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PID_FILE = join(tmpdir(), 'claude-snake.pid');
const PREV_APP_FILE = join(tmpdir(), 'claude-snake-prevapp.txt');

if (existsSync(PID_FILE)) {
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8'));
    process.kill(pid, 'SIGUSR1');
  } catch {
    // process already gone — nothing to do
  }
}

// Restore focus to the app the user was in before Snake activated
if (process.platform === 'darwin' && existsSync(PREV_APP_FILE)) {
  try {
    const prevApp = readFileSync(PREV_APP_FILE, 'utf8').trim();
    if (prevApp) {
      execSync(
        `osascript -e 'tell application "${prevApp}" to activate'`,
        { stdio: 'ignore' }
      );
    }
    unlinkSync(PREV_APP_FILE);
  } catch {}
}

process.exit(0);

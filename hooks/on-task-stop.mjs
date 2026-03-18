#!/usr/bin/env node

// Signals the Snake game that the background task finished.
// Sends SIGUSR1 so the game shows a "Task Complete" banner.

import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PID_FILE = join(tmpdir(), 'claude-snake.pid');

if (existsSync(PID_FILE)) {
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8'));
    process.kill(pid, 'SIGUSR1');
  } catch {
    // process already gone — nothing to do
  }
}

process.exit(0);

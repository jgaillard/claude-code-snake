#!/usr/bin/env node

// snake.mjs — Terminal Snake for Claude Code
// Zero dependencies. Play while your agent works.

import { stdin, stdout } from 'node:process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PID_FILE = join(tmpdir(), 'claude-snake.pid');
const PREV_APP_FILE = join(tmpdir(), 'claude-snake-prevapp.txt');

// Write PID so hooks can find us
writeFileSync(PID_FILE, String(process.pid));

// ── ANSI helpers ──────────────────────────────────────────────────────
const CSI = '\x1b[';
const ENTER_ALT = '\x1b[?1049h';
const EXIT_ALT = '\x1b[?1049l';
const HIDE_CUR = CSI + '?25l';
const SHOW_CUR = CSI + '?25h';
const CLEAR = CSI + '2J' + CSI + 'H';
const RESET = CSI + '0m';

const moveTo = (x, y) => CSI + (y + 1) + ';' + (x + 1) + 'H';
const fg = (c) => CSI + '38;5;' + c + 'm';
const bgc = (c) => CSI + '48;5;' + c + 'm';
const bold = CSI + '1m';

// ── Game state ────────────────────────────────────────────────────────
let cols, rows, gameW, gameH;
let snake, dir, nextDir, food, score, highScore, gameOver, paused, speed;
let monster, monsterTick, monsterActive;
let interval;
let taskComplete = false;

// Each cell is 2 chars wide to appear square in the terminal
const CELL_W = 2;

function init() {
  cols = stdout.columns || 80;
  rows = stdout.rows || 24;
  gameW = Math.min(Math.floor((cols - 4) / CELL_W), 29);
  gameH = Math.min(rows - 6, 18);

  const cx = Math.floor(gameW / 2);
  const cy = Math.floor(gameH / 2);
  snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  food = null;
  score = 0;
  speed = 110;
  gameOver = false;
  paused = false;
  monster = null;
  monsterTick = 0;
  monsterActive = false;
  spawnFood();
}

function spawnFood() {
  const taken = new Set(snake.map((s) => s.x + ',' + s.y));
  const margin = 2; // never spawn within 2 cells of the edge
  let pos;
  let tries = 0;
  do {
    pos = {
      x: margin + Math.floor(Math.random() * (gameW - margin * 2)),
      y: margin + Math.floor(Math.random() * (gameH - margin * 2)),
    };
    if (++tries > gameW * gameH) break;
  } while (taken.has(pos.x + ',' + pos.y));
  food = pos;
}

// ── Game loop ─────────────────────────────────────────────────────────
function tick() {
  if (gameOver || paused) return;

  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= gameW || head.y < 0 || head.y >= gameH) {
    gameOver = true;
    if (score > highScore) highScore = score;
    render();
    return;
  }

  // Self collision
  if (snake.some((s) => s.x === head.x && s.y === head.y)) {
    gameOver = true;
    if (score > highScore) highScore = score;
    render();
    return;
  }

  // Monster collision (head runs into monster)
  if (monster && head.x === monster.x && head.y === monster.y) {
    gameOver = true;
    if (score > highScore) highScore = score;
    render();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    spawnFood();
    if (speed > 45) speed -= 4;
    clearInterval(interval);
    interval = setInterval(tick, speed);
  } else {
    snake.pop();
  }

  // Spawn monster after score 30, moves every 3 ticks
  monsterTick++;
  if (!monsterActive && score >= 30) {
    monsterActive = true;
    // Spawn in a corner away from the snake head
    const corners = [
      { x: 1, y: 1 },
      { x: gameW - 2, y: 1 },
      { x: 1, y: gameH - 2 },
      { x: gameW - 2, y: gameH - 2 },
    ];
    // Pick the corner farthest from the snake head
    corners.sort((a, b) => {
      const da = Math.abs(a.x - head.x) + Math.abs(a.y - head.y);
      const db = Math.abs(b.x - head.x) + Math.abs(b.y - head.y);
      return db - da;
    });
    monster = { ...corners[0] };
  }

  if (monster && monsterTick % 3 === 0) {
    // Chase the snake head with some randomness
    const mHead = snake[0];
    if (Math.random() < 0.7) {
      // Move toward the snake
      const dx = Math.sign(mHead.x - monster.x);
      const dy = Math.sign(mHead.y - monster.y);
      // Prefer the axis with more distance
      if (Math.abs(mHead.x - monster.x) > Math.abs(mHead.y - monster.y)) {
        monster.x += dx;
      } else if (dy !== 0) {
        monster.y += dy;
      } else {
        monster.x += dx;
      }
    } else {
      // Random wander
      const moves = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      const m = moves[Math.floor(Math.random() * moves.length)];
      monster.x += m.x;
      monster.y += m.y;
    }
    // Clamp to board
    monster.x = Math.max(0, Math.min(gameW - 1, monster.x));
    monster.y = Math.max(0, Math.min(gameH - 1, monster.y));

    // Monster landed on the snake?
    if (snake.some((s) => s.x === monster.x && s.y === monster.y)) {
      gameOver = true;
      if (score > highScore) highScore = score;
    }
  }

  render();
}

// ── Rendering ─────────────────────────────────────────────────────────
function render() {
  let buf = CLEAR;
  // Rendered width of game area in terminal columns
  const renderW = gameW * CELL_W;
  const offX = Math.floor((cols - renderW - 2) / 2);
  const offY = 2;

  // Title
  const title = ' SNAKE ';
  buf += moveTo(Math.floor((cols - 20) / 2), 0);
  buf += fg(34) + bold + '>>> ' + fg(46) + title + fg(34) + ' <<<' + RESET;

  // Top border
  buf += moveTo(offX, offY);
  buf += fg(238) + '\u250c' + '\u2500'.repeat(renderW) + '\u2510' + RESET;

  // Side borders
  for (let y = 0; y < gameH; y++) {
    buf += moveTo(offX, offY + 1 + y) + fg(238) + '\u2502' + RESET;
    buf += moveTo(offX + renderW + 1, offY + 1 + y) + fg(238) + '\u2502' + RESET;
  }

  // Bottom border
  buf += moveTo(offX, offY + gameH + 1);
  buf += fg(238) + '\u2514' + '\u2500'.repeat(renderW) + '\u2518' + RESET;

  // Food — 2-char wide cell
  buf += moveTo(offX + 1 + food.x * CELL_W, offY + 1 + food.y);
  buf += fg(196) + bold + '\u25cf ' + RESET;

  // Snake body (gradient from dark to bright green) — 2-char wide cells
  for (let i = snake.length - 1; i >= 1; i--) {
    const shade = 22 + Math.floor((1 - i / snake.length) * 12);
    buf += moveTo(offX + 1 + snake[i].x * CELL_W, offY + 1 + snake[i].y);
    buf += fg(shade) + '\u2588\u2588' + RESET;
  }

  // Snake head — 2-char wide cell
  buf += moveTo(offX + 1 + snake[0].x * CELL_W, offY + 1 + snake[0].y);
  buf += fg(46) + bold + '\u2588\u2588' + RESET;

  // Monster — pulsing red/magenta skull
  if (monster) {
    buf += moveTo(offX + 1 + monster.x * CELL_W, offY + 1 + monster.y);
    const pulse = monsterTick % 6 < 3 ? 196 : 201; // alternate red/magenta
    buf += fg(pulse) + bold + '\u2620 ' + RESET;
  }

  // Score bar
  const pct = Math.round(((200 - speed) / 145) * 100);
  const info = `Score: ${score}  |  Hi: ${highScore}  |  Speed: ${pct}%`;
  buf += moveTo(Math.floor((cols - info.length) / 2), offY + gameH + 2);
  buf += fg(245) + info + RESET;

  // Controls
  const controls = '\u2190\u2191\u2193\u2192/WASD move  |  p pause  |  r restart  |  q quit';
  buf += moveTo(Math.floor((cols - controls.length) / 2), offY + gameH + 3);
  buf += fg(239) + controls + RESET;

  // Paused overlay
  if (paused && !gameOver) {
    const msg = ' PAUSED ';
    buf += moveTo(Math.floor((cols - msg.length) / 2), Math.floor(rows / 2));
    buf += bgc(236) + fg(226) + bold + msg + RESET;
  }

  // Game over overlay
  if (gameOver) {
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    const go = ' GAME OVER ';
    const sc = ` Score: ${score} `;
    const hi = score >= highScore ? ' NEW HIGH SCORE! ' : '';
    const rs = ' r restart | q quit ';

    buf += moveTo(cx - Math.floor(go.length / 2), cy - 1);
    buf += bgc(196) + fg(231) + bold + go + RESET;
    buf += moveTo(cx - Math.floor(sc.length / 2), cy);
    buf += bgc(236) + fg(231) + sc + RESET;
    if (hi) {
      buf += moveTo(cx - Math.floor(hi.length / 2), cy + 1);
      buf += bgc(226) + fg(0) + bold + hi + RESET;
    }
    buf += moveTo(cx - Math.floor(rs.length / 2), cy + (hi ? 2 : 1));
    buf += bgc(236) + fg(245) + rs + RESET;
  }

  // Task complete banner
  if (taskComplete) {
    const tc = ' TASK COMPLETE  -  press q to return to Claude Code ';
    buf += moveTo(Math.floor((cols - tc.length) / 2), rows - 1);
    buf += bgc(22) + fg(46) + bold + tc + RESET;
  }

  stdout.write(buf);
}

// ── Countdown ─────────────────────────────────────────────────────────
function countdown(cb) {
  clearInterval(interval);
  paused = true;
  let count = 3;

  function drawCount() {
    let buf = CLEAR;
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);

    const label = ' NEW TASK STARTED ';
    buf += moveTo(cx - Math.floor(label.length / 2), cy - 3);
    buf += bgc(25) + fg(81) + bold + label + RESET;

    const num = ` ${count} `;
    buf += moveTo(cx - 1, cy);
    buf += fg(226) + bold + num + RESET;

    const sub = count > 0 ? ' get ready... ' : '     GO!     ';
    buf += moveTo(cx - Math.floor(sub.length / 2), cy + 2);
    buf += fg(245) + sub + RESET;

    stdout.write(buf);
  }

  drawCount();
  const cid = setInterval(() => {
    count--;
    if (count < 0) {
      clearInterval(cid);
      paused = false;
      cb();
      return;
    }
    drawCount();
  }, 800);
}

// ── Input handling ────────────────────────────────────────────────────
function onKey(key) {
  if (key === '\x03' || key === 'q' || key === 'Q') {
    cleanup();
    process.exit(0);
  }

  if (key === 'r' || key === 'R') {
    clearInterval(interval);
    init();
    interval = setInterval(tick, speed);
    render();
    return;
  }

  if (key === 'p' || key === 'P') {
    paused = !paused;
    render();
    return;
  }

  if (gameOver || paused) return;

  // Arrow keys + WASD
  if (key === '\x1b[A' || key === 'w' || key === 'W') {
    if (dir.y !== 1) nextDir = { x: 0, y: -1 };
  } else if (key === '\x1b[B' || key === 's' || key === 'S') {
    if (dir.y !== -1) nextDir = { x: 0, y: 1 };
  } else if (key === '\x1b[C' || key === 'd' || key === 'D') {
    if (dir.x !== -1) nextDir = { x: 1, y: 0 };
  } else if (key === '\x1b[D' || key === 'a' || key === 'A') {
    if (dir.x !== 1) nextDir = { x: -1, y: 0 };
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
function cleanup() {
  clearInterval(interval);
  stdout.write(SHOW_CUR + EXIT_ALT);
  try {
    stdin.setRawMode(false);
  } catch {}
  try {
    unlinkSync(PID_FILE);
  } catch {}
  // Restore focus to the Claude Code Terminal window by its saved window ID
  if (process.platform === 'darwin' && existsSync(PREV_APP_FILE)) {
    try {
      const windowId = readFileSync(PREV_APP_FILE, 'utf8').trim();
      if (windowId) {
        execSync(
          `osascript -e 'tell application "Terminal" to set index of window id ${windowId} to 1'`,
          { stdio: 'ignore' }
        );
      }
      unlinkSync(PREV_APP_FILE);
    } catch {}
  }
}

function start() {
  highScore = 0;

  stdout.write(ENTER_ALT + HIDE_CUR);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', onKey);

  // Handle terminal resize
  stdout.on('resize', () => {
    const oldW = gameW;
    const oldH = gameH;
    cols = stdout.columns || 80;
    rows = stdout.rows || 24;
    gameW = Math.min(Math.floor((cols - 4) / CELL_W), 29);
    gameH = Math.min(rows - 6, 18);
    // If board shrank, clamp snake positions
    if (gameW < oldW || gameH < oldH) {
      for (const seg of snake) {
        seg.x = Math.min(seg.x, gameW - 1);
        seg.y = Math.min(seg.y, gameH - 1);
      }
      if (food.x >= gameW || food.y >= gameH) spawnFood();
    }
    render();
  });

  // SIGUSR1 = task complete notification from hook
  process.on('SIGUSR1', () => {
    taskComplete = true;
    render();
  });

  // SIGUSR2 = new task started — reset game with countdown
  process.on('SIGUSR2', () => {
    taskComplete = false;
    clearInterval(interval);
    init();
    countdown(() => {
      render();
      interval = setInterval(tick, speed);
    });
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  init();
  countdown(() => {
    render();
    interval = setInterval(tick, speed);
  });
}

start();

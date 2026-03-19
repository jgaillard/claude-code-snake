# claude-code-snake

Play Snake in your terminal while waiting for Claude Code tasks to complete.

https://github.com/jgaillard/claude-code-snake/raw/main/demo.mp4

## Features

- **Auto-launches** when a background agent starts
- **3-2-1-GO countdown** before each game
- **Monster chase** after 30 points — a skull starts hunting you
- **Task complete banner** when the agent finishes
- **Auto-focus switching** — brings you to the game when a task starts, back to Claude Code when you press `q`
- **18pt font** for comfortable gameplay
- Zero dependencies, pure Node.js

## Install

```bash
claude plugin marketplace add jgaillard/claude-code-snake
claude plugin install claude-code-snake
```

Restart Claude Code to activate.

## How it works

When you launch a background agent, a Terminal window opens with Snake. Play while your task runs. When it finishes, a green "TASK COMPLETE" banner appears — press `q` to switch back to Claude Code.

If another task starts while you're already playing, the game resets with a countdown.

## Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move |
| `p` | Pause |
| `r` | Restart |
| `q` | Quit and return to Claude Code |

## Manual play

You can also launch it manually:

```bash
node /path/to/claude-code-snake/snake.mjs
```

Or use the `/snake` skill inside Claude Code.

## How it's built

- **Game engine**: Pure Node.js with ANSI escape codes — no dependencies
- **Hooks**: `SubagentStart` / `SubagentStop` trigger the game lifecycle
- **IPC**: Unix signals (`SIGUSR1` for task complete, `SIGUSR2` for new task)
- **Window management**: AppleScript saves/restores Terminal window IDs on macOS
- **Cross-platform**: macOS (Terminal.app) and Linux (gnome-terminal, xterm, konsole)

## License

MIT

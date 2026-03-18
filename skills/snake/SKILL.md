---
name: snake
description: Play Snake in your terminal while waiting for Claude Code tasks to complete
user-invocable: true
allowed-tools: Bash(osascript *), Bash(node *), Bash(gnome-terminal *), Bash(xterm *)
---

Launch the Snake game in a new terminal window.

On macOS, run:
```bash
osascript -e 'tell application "Terminal"
  activate
  do script "node '"'"'${CLAUDE_SKILL_DIR}/../../snake.mjs'"'"'"
end tell'
```

On Linux, run:
```bash
gnome-terminal -- node "${CLAUDE_SKILL_DIR}/../../snake.mjs" 2>/dev/null || xterm -e "node '${CLAUDE_SKILL_DIR}/../../snake.mjs'" 2>/dev/null
```

After launching, tell the user:
- Arrow keys or WASD to move
- p to pause, r to restart, q to quit
- When a background task finishes, a green banner will appear

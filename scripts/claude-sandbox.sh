#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="${CC_ROUTER_SANDBOX:-$ROOT/.sandbox}"
CONFIG_DIR="$SANDBOX/config"
SETTINGS="$SANDBOX/claude-settings.json"

mkdir -p "$CONFIG_DIR"

if [[ ! -f "$SETTINGS" ]]; then
  cat > "$SETTINGS" <<JSON
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node $ROOT/hooks/user-prompt-submit.js"
          }
        ]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "node $ROOT/bin/statusline.js"
  }
}
JSON
fi

export CC_ROUTER_CONFIG_DIR="$CONFIG_DIR"

echo "Sandbox Claude settings : $SETTINGS"
echo "Real ~/.claude/settings.json : untouched"
echo "Router config dir       : $CONFIG_DIR"
echo

exec claude --settings "$SETTINGS" "$@"

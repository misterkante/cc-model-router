#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test for the two Claude Code integrations that unit tests
# cannot cover: the statusline is rendered by the TUI, and UserPromptSubmit
# receives a real payload from Claude Code.
#
# Opt-in: needs `claude`, `tmux` and a working Claude Code login. It starts a
# throwaway TUI in a temporary directory, sends one tiny prompt, checks the
# hook log and the statusline, then kills the session. It does not touch the
# real ~/.claude settings or router config.
#
# Usage:
#   bash scripts/tui-smoke.sh
#   bash scripts/tui-smoke.sh --sonnet-first
#   npm run test:tui -- --sonnet-first

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-default}"

case "$MODE" in
  default | --sonnet-first) ;;
  *)
    echo "usage: bash scripts/tui-smoke.sh [--sonnet-first]" >&2
    exit 2
    ;;
esac

for bin in claude tmux; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "tui-smoke: missing required command: $bin" >&2
    exit 2
  fi
done

TMP="$(mktemp -d "${TMPDIR:-/tmp}/cc-router-tui-XXXXXX")"
WORK="$TMP/work"
SANDBOX="$TMP/sandbox"
SOCKET="cc-router-tui-$$"
SESSION="cc-router-tui"
LOG="$SANDBOX/config/router.log"

mkdir -p "$WORK" "$SANDBOX/config"
if [[ "$MODE" == "--sonnet-first" ]]; then
  printf '%s\n' '{"debuggingStrategy":"sonnet-first"}' \
    > "$SANDBOX/config/model-router.json"
  EXPECTED_STATUSLINE="M:haiku I:sonnet D:sonnet→opus"
else
  EXPECTED_STATUSLINE="M:haiku I:sonnet D:opus"
fi

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    echo "tui-smoke: sha256sum or shasum required" >&2
    exit 2
  fi
}

REAL_SETTINGS="$HOME/.claude/settings.json"
REAL_ROUTER="$HOME/.claude/model-router.json"
settings_hash=""
router_hash=""
if [[ -f "$REAL_SETTINGS" ]]; then
  settings_hash="$(hash_file "$REAL_SETTINGS")"
fi
if [[ -f "$REAL_ROUTER" ]]; then
  router_hash="$(hash_file "$REAL_ROUTER")"
fi
repo_status="$(git -C "$ROOT" status --porcelain 2>/dev/null || true)"

cleanup() {
  tmux -L "$SOCKET" kill-session -t "$SESSION" 2>/dev/null || true
  tmux -L "$SOCKET" kill-server 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

capture() {
  tmux -L "$SOCKET" capture-pane -p -t "$SESSION" 2>/dev/null || true
}

wait_for() {
  local pattern="$1"
  local timeout="${2:-30}"
  local i
  for ((i = 0; i < timeout * 2; i += 1)); do
    if capture | grep -q "$pattern"; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

fail() {
  echo "tui-smoke: FAIL: $*" >&2
  echo "--- last screen ---" >&2
  capture | tail -40 >&2 || true
  exit 1
}

echo "tui-smoke: starting sandbox TUI in $WORK"
tmux -L "$SOCKET" kill-server 2>/dev/null || true
tmux -L "$SOCKET" new-session -d -s "$SESSION" -x 120 -y 40 -c "$WORK" \
  "env PATH='$PATH' CC_ROUTER_SANDBOX='$SANDBOX' '$ROOT/scripts/claude-sandbox.sh'"

# A fresh directory may trigger Claude Code's trust prompt. The default is
# "No, exit", so move down to "Yes, I trust this folder" before confirming.
sleep 2
if capture | grep -qi "trust"; then
  tmux -L "$SOCKET" send-keys -t "$SESSION" Down
  sleep 0.2
  tmux -L "$SOCKET" send-keys -t "$SESSION" Enter
  sleep 2
fi

if ! wait_for "$EXPECTED_STATUSLINE" 30; then
  fail "statusline mapping not found (expected: $EXPECTED_STATUSLINE)"
fi
echo "tui-smoke: ok statusline: $(capture | grep -o "$EXPECTED_STATUSLINE" | head -1)"

# The prompt is intentionally harmless: it classifies as debugging, but asks
# for a one-word answer and forbids tools. The hook fires before the model
# finishes, so the test does not wait for a full task.
tmux -L "$SOCKET" send-keys -t "$SESSION" -l \
  "debug why the login test is flaky. Reply exactly OK and do not use tools."
sleep 0.5
tmux -L "$SOCKET" send-keys -t "$SESSION" C-m

for ((i = 0; i < 40; i += 1)); do
  if [[ -f "$LOG" ]] && grep -q '"tier":"debugging"' "$LOG"; then
    break
  fi
  sleep 0.5
done

if [[ ! -f "$LOG" ]] || ! grep -q '"tier":"debugging"' "$LOG"; then
  fail "hook log did not receive a debugging classification at $LOG"
fi
echo "tui-smoke: ok hook: $(grep '"tier":"debugging"' "$LOG" | tail -1)"

# Give the statusline one more frame after the prompt.
sleep 1
if ! capture | grep -q "$EXPECTED_STATUSLINE"; then
  fail "statusline disappeared after the prompt"
fi

if [[ -f "$REAL_SETTINGS" ]]; then
  [[ "$(hash_file "$REAL_SETTINGS")" == "$settings_hash" ]] \
    || fail "real ~/.claude/settings.json changed"
elif [[ -e "$REAL_SETTINGS" ]]; then
  fail "real ~/.claude/settings.json was created"
fi

if [[ -f "$REAL_ROUTER" ]]; then
  [[ "$(hash_file "$REAL_ROUTER")" == "$router_hash" ]] \
    || fail "real ~/.claude/model-router.json changed"
elif [[ -e "$REAL_ROUTER" ]]; then
  fail "real ~/.claude/model-router.json was created"
fi

if [[ "$(git -C "$ROOT" status --porcelain 2>/dev/null || true)" != "$repo_status" ]]; then
  fail "repository working tree changed"
fi

echo "tui-smoke: real ~/.claude settings and repo unchanged"
echo "tui-smoke: PASS ($MODE)"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="${CC_ROUTER_SANDBOX:-$ROOT/.sandbox}"
CONFIG_DIR="$SANDBOX/config"

mkdir -p "$CONFIG_DIR"
cp "$ROOT/examples/model-router.json" "$CONFIG_DIR/model-router.json"

export CC_ROUTER_CONFIG_DIR="$CONFIG_DIR"
export CC_ROUTER_DRY_RUN="${CC_ROUTER_DRY_RUN:-1}"

echo "Sandbox config dir : $CONFIG_DIR"
echo "Real ~/.claude     : untouched"
echo

run() {
  echo "\$ $*"
  "$@"
  echo
}

run node "$ROOT/bin/cc-model-router.js" classify "debug why the login test is flaky"
run node "$ROOT/bin/cc-model-router.js" run "implement the auth endpoint"
run node "$ROOT/bin/cc-model-router.js" status

echo '{"prompt":"implement a REST endpoint"}' | node "$ROOT/hooks/user-prompt-submit.js"
echo
echo '{"model":{"display_name":"Opus 5.5"}}' | node "$ROOT/bin/statusline.js"
echo
echo "Hook log           : $CONFIG_DIR/router.log"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo '$ ccmr classify "debug why the login test is flaky"'
node bin/cc-model-router.js classify "debug why the login test is flaky"
echo
echo '$ ccmr status'
node bin/cc-model-router.js status
echo
echo '$ CC_ROUTER_DRY_RUN=1 ccmr run "implement the auth endpoint" --verify "npm test" --escalate'
CC_ROUTER_DRY_RUN=1 node bin/cc-model-router.js run "implement the auth endpoint" --verify "npm test" --escalate

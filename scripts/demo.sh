#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo '$ cc-router classify "debug why the login test is flaky"'
node bin/cc-router.js classify "debug why the login test is flaky"
echo
echo '$ cc-router status'
node bin/cc-router.js status
echo
echo '$ CC_ROUTER_DRY_RUN=1 cc-router run "implement the auth endpoint" --verify "npm test" --escalate'
CC_ROUTER_DRY_RUN=1 node bin/cc-router.js run "implement the auth endpoint" --verify "npm test" --escalate

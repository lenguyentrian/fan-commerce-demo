#!/usr/bin/env bash
# One-shot verification used while building this repo. Mirrors CI.
set -uo pipefail

cd "$(dirname "$0")/.."
fail=0

run() {
  local label="$1"; shift
  echo ""
  echo "=== ${label} ==="
  if "$@" > /tmp/fc-check.log 2>&1; then
    tail -n "${TAIL:-6}" /tmp/fc-check.log
    echo "[ok] ${label}"
  else
    tail -n 30 /tmp/fc-check.log
    echo "[FAIL] ${label}"
    fail=1
  fi
}

run "lint" npm run lint
run "typecheck" npm run typecheck
TAIL=10 run "unit tests" npm test
TAIL=30 run "build" npm run build

echo ""
echo "=== prerendered product pages ==="
find apps/web/.next/server/app/products -name '*.html' 2>/dev/null | sed 's|.*/||' | sort

TAIL=12 run "e2e" npm run test:e2e

echo ""
if [ "${fail}" -eq 0 ]; then
  echo "ALL CHECKS PASSED"
else
  echo "SOME CHECKS FAILED"
fi
exit "${fail}"

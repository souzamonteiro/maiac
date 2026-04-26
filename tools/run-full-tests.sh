#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "Running full MaiaC regression suite..."
echo
echo "==> Bundle tests (compiler/tests/test-all.js)"
node compiler/tests/test-all.js

echo
echo "==> Extra tests not included in test-all.js"

extras=(
  compiler/tests/test-error-points-diagnosis.js
  compiler/tests/test-member-access-debug.js
  compiler/tests/test-phase2-declarators-diagnosis.js
  compiler/tests/test-preprocessed.js
  compiler/tests/test-ptr-array-simple.js
  compiler/tests/test-ptr-indices.js
  compiler/tests/test-second-access-only.js
  compiler/tests/test-struct-ptr-debug.js
  compiler/tests/test-two-arrow-accesses.js
  compiler/tests/test-two-stores.js
  compiler/tests/test-wat-debug.js
  compiler/tests/test-wat-ptr-nodes1.js
  compiler/tests/test-wat-ptr0.js
)

pass=0
for test_file in "${extras[@]}"; do
  echo "==> $(basename "$test_file")"
  node "$test_file"
  pass=$((pass + 1))
  echo

done

echo "Full regression summary: bundle PASS + ${pass}/${#extras[@]} extra PASS"

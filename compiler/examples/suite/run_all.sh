#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
FILTER=""
if [[ $# -gt 0 ]]; then
    FILTER="$1"
fi

PASS=0
FAIL=0
SKIP=0

normalize_output() {
    sed '/^\[node-runner\] program returned:/d' | sed '/^$/N;/^\n$/D' | awk '{print}' | sed -e '${/^[[:space:]]*$/d;}' 
}

for test_dir in "$SCRIPT_DIR"/*/; do
    [[ -d "$test_dir" ]] || continue
    dir_name="$(basename "$test_dir")"
    [[ -z "$FILTER" || "$dir_name" == *"$FILTER"* ]] || continue

    expected="$test_dir/expected_output.txt"
    runner="$test_dir/dist/node-runner.sh"

    if [[ ! -f "$expected" || ! -f "$runner" ]]; then
        echo "--> $dir_name"
        echo "    SKIP — missing expected_output.txt or dist/node-runner.sh"
        SKIP=$((SKIP + 1))
        continue
    fi

    echo "--> $dir_name/$(basename "$test_dir")"
    actual_tmp="$(mktemp)"
    expected_tmp="$(mktemp)"

    bash "$runner" > "$actual_tmp" 2>&1 || true
    normalize_output < "$actual_tmp" > "$actual_tmp.norm"
    normalize_output < "$expected" > "$expected_tmp"

    if diff -u "$expected_tmp" "$actual_tmp.norm" >/dev/null 2>&1; then
        echo "    PASS"
        PASS=$((PASS + 1))
    else
        echo "    FAIL — output mismatch"
        echo "    ┌── expected ──────────────────────────────────────"
        sed 's/^/    │ /' "$expected_tmp"
        echo "    ├── actual ────────────────────────────────────────"
        sed 's/^/    │ /' "$actual_tmp.norm"
        echo "    └─────────────────────────────────────────────────"
        FAIL=$((FAIL + 1))
    fi

    rm -f "$actual_tmp" "$actual_tmp.norm" "$expected_tmp"
    echo ""
done

echo "========================================"
echo "Results: $PASS passed  /  $FAIL failed  /  $SKIP skipped"
echo "========================================"

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
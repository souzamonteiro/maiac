#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
MAIAC_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
WEBC="$MAIAC_ROOT/tools/webc.js"

VERBOSE=0
FILTER=""
for arg in "$@"; do
    case "$arg" in
        --verbose|-v) VERBOSE=1 ;;
        *) FILTER="$arg" ;;
    esac
done

PASS=0
FAIL=0

build_one() {
    local src="$1"
    local dir
    local stem
    local dist_dir
    local cmd
    local log_file
    local rc

    dir="$(dirname "$src")"
    stem="$(basename "${src%.c}")"
    dist_dir="$dir/dist"
    log_file="$(mktemp)"

    echo ""
    echo "==> $(basename "$dir")/$stem.c"

    cmd=(node "$WEBC" "$src" --dist --out-dir "$dist_dir" --name "$stem" --wat)

    if [[ "$VERBOSE" -eq 1 ]]; then
        "${cmd[@]}"
        rc=$?
    else
        "${cmd[@]}" >"$log_file" 2>&1
        rc=$?
        if ! grep -E '^\[webc\]|ERROR|error:' "$log_file"; then
            true
        fi
    fi

    if [[ "$rc" -ne 0 ]]; then
        echo "    FAILED (exit $rc)"
        FAIL=$((FAIL + 1))
        rm -f "$log_file"
        return
    fi

    echo "    OK - WAT: $stem.wat  WASM: $(wc -c < "$dist_dir/$stem.wasm")B"
    PASS=$((PASS + 1))
    rm -f "$log_file"
}

for test_dir in "$SCRIPT_DIR"/*/; do
    [[ -d "$test_dir" ]] || continue
    dir_name="$(basename "$test_dir")"
    [[ -z "$FILTER" || "$dir_name" == *"$FILTER"* ]] || continue

    for src in "$test_dir"*.c; do
        [[ -f "$src" ]] || continue
        build_one "$src"
    done
done

echo ""
echo "========================================"
echo "Build complete: $PASS built, $FAIL failed"
echo "========================================"

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi

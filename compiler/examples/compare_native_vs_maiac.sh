#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
WEBC="$ROOT_DIR/bin/webc.sh"
EXAMPLE_ROOT="$SCRIPT_DIR/c89-parity"

if [[ ! -x "$WEBC" ]]; then
  echo "Error: MaiaC driver not found or not executable: $WEBC" >&2
  exit 1
fi

if ! command -v gcc >/dev/null 2>&1; then
  echo "Error: gcc is required for native comparison." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required to run MaiaC wrappers." >&2
  exit 1
fi

mapfile -t SOURCES < <(find "$EXAMPLE_ROOT" -type f -name "*.c" | sort)
if [[ ${#SOURCES[@]} -eq 0 ]]; then
  echo "No C examples found under $EXAMPLE_ROOT" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

pass_count=0
fail_count=0
native_build_fail_count=0
maiac_build_fail_count=0
runtime_fail_count=0

echo "Comparing GCC vs MaiaC for ${#SOURCES[@]} examples..."
echo

for src in "${SOURCES[@]}"; do
  rel="${src#$SCRIPT_DIR/}"
  stem="$(echo "$rel" | tr '/' '_' | sed 's/\.c$//')"

  native_bin="$TMP_DIR/${stem}.native"
  maia_base="$TMP_DIR/${stem}.maia"
  native_out="$TMP_DIR/${stem}.native.out"
  maia_out="$TMP_DIR/${stem}.maia.out"

  set +e
  gcc -std=c89 -Wall -Wextra -pedantic "$src" -o "$native_bin" >"$TMP_DIR/${stem}.native.build.log" 2>&1
  native_build_code=$?
  set -e
  if [[ $native_build_code -ne 0 ]]; then
    printf "NATIVE_BUILD_FAIL  %s\n" "$rel"
    cat "$TMP_DIR/${stem}.native.build.log"
    echo
    native_build_fail_count=$((native_build_fail_count + 1))
    fail_count=$((fail_count + 1))
    continue
  fi

  set +e
  "$WEBC" "$src" -o "$maia_base" >"$TMP_DIR/${stem}.build.log" 2>&1
  maia_build_code=$?
  set -e
  if [[ $maia_build_code -ne 0 ]]; then
    printf "MAIAC_BUILD_FAIL  %s\n" "$rel"
    cat "$TMP_DIR/${stem}.build.log"
    echo
    maiac_build_fail_count=$((maiac_build_fail_count + 1))
    fail_count=$((fail_count + 1))
    continue
  fi

  set +e
  "$native_bin" >"$native_out" 2>&1
  native_code=$?
  set -e

  set +e
  node -e "const mod=require(process.argv[1]); mod.run(process.argv[2]).then(code=>process.exit(code||0)).catch(err=>{console.error(err&&err.stack?err.stack:String(err));process.exit(1);});" \
    "$maia_base.js" "$maia_base.wasm" >"$maia_out" 2>&1
  maia_code=$?
  set -e

  if [[ $native_code -ne 0 || $maia_code -ne 0 ]]; then
    runtime_fail_count=$((runtime_fail_count + 1))
  fi

  if [[ $native_code -eq $maia_code ]] && cmp -s "$native_out" "$maia_out"; then
    printf "PASS  %s\n" "$rel"
    pass_count=$((pass_count + 1))
  else
    printf "FAIL  %s\n" "$rel"
    echo "  native exit: $native_code"
    echo "  maia   exit: $maia_code"
    echo "  output diff:"
    diff -u "$native_out" "$maia_out" || true
    fail_count=$((fail_count + 1))
  fi
  echo

done

echo "Summary: PASS=$pass_count FAIL=$fail_count NATIVE_BUILD_FAIL=$native_build_fail_count MAIAC_BUILD_FAIL=$maiac_build_fail_count RUNTIME_FAIL=$runtime_fail_count"

if [[ $fail_count -ne 0 ]]; then
  exit 1
fi

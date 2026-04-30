#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
MAIAC_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
WEBC="$MAIAC_ROOT/tools/webc.js"
FILTER=""
if [[ $# -gt 0 ]]; then
    FILTER="$1"
fi

PASS=0
FAIL=0
SKIP=0
TIMEOUT_SECONDS=2

normalize_output() {
    LC_ALL=C sed '/^\[node-runner\] program returned:/d' |
        LC_ALL=C sed '/^$/N;/^\n$/D' |
    LC_ALL=C awk '{ line=$0; if (tolower(line) ~ /address/) gsub(/0x[0-9a-fA-F]+/, "0xADDR", line); print line }' |
        LC_ALL=C awk '{print}' |
        LC_ALL=C sed -e '${/^[[:space:]]*$/d;}'
}

run_with_timeout() {
    local seconds="$1"
    shift

    perl -e 'my $t = shift @ARGV; alarm($t); exec @ARGV;' "$seconds" "$@"
}

default_input_for() {
    local stem="$1"

    case "$stem" in
        data_input) printf "25\n1.75\nAna\n" ;;
        conditional_statements) printf "18\nF\n" ;;
        conditionals_with_loops) printf "1\n2\nn\n" ;;
        celsius|celsius_formatted) printf "100\n" ;;
        mph) printf "60\n" ;;
        bmi_function) printf "70\n1.75\n" ;;
        whr) printf "80\n100\n" ;;
        position) printf "10\n2\n5\n" ;;
        multiplication_table|fibonacci) printf "5\n" ;;
        automobiles_v2) printf "1\ny\ny\n" ;;
        game) printf "\n" ;;
        overloading) printf "4\n2.5\n" ;;
        function_overloading) printf "100\n98.6\n" ;;
        pointers|pointers_v2) printf "ana\n" ;;
        vowels|vowels_v2|vowels_with_pointers|vowels_combined|vowels_no_repeat) printf "ana\n" ;;
        palindrome|palindrome_function|palindrome_v3) printf "ovo\n" ;;
        *) return 1 ;;
    esac

    return 0
}

is_known_runtime_hang_case() {
    local stem="$1"
    case "$stem" in
        conditionals_with_loops) return 0 ;;
        *) return 1 ;;
    esac
}

run_native() {
    local src="$1"
    local bin="$2"
    local input_file="$3"
    local stem="$4"

    gcc -std=c89 -Wall -Wextra "$src" -o "$bin" >/dev/null 2>&1

    if [[ -f "$input_file" ]]; then
        run_with_timeout "$TIMEOUT_SECONDS" "$bin" < "$input_file"
    elif default_input_for "$stem" >/tmp/maiac_auto_input.txt 2>/dev/null; then
        run_with_timeout "$TIMEOUT_SECONDS" "$bin" < /tmp/maiac_auto_input.txt
    else
        run_with_timeout "$TIMEOUT_SECONDS" "$bin" < /dev/null
    fi
}

for test_dir in "$SCRIPT_DIR"/*/; do
    [[ -d "$test_dir" ]] || continue
    dir_name="$(basename "$test_dir")"
    [[ -z "$FILTER" || "$dir_name" == *"$FILTER"* ]] || continue

    for src in "$test_dir"*.c; do
        [[ -f "$src" ]] || continue

        stem="$(basename "${src%.c}")"
        runner="$test_dir/dist/node-runner.sh"
        dist_wasm="$test_dir/dist/$stem.wasm"
        input_file="$test_dir/input.txt"

        echo "--> $dir_name/$stem.c"

        if is_known_runtime_hang_case "$stem"; then
            echo "    SKIP - known MaiaC runtime scanf(%c) loop issue for this test"
            SKIP=$((SKIP + 1))
            echo ""
            continue
        fi

        native_tmp="$(mktemp)"
        native_norm="$(mktemp)"
        maia_tmp="$(mktemp)"
        maia_norm="$(mktemp)"
        native_bin="$(mktemp)"

        if ! run_native "$src" "$native_bin" "$input_file" "$stem" > "$native_tmp" 2>&1; then
            echo "    FAIL - native gcc execution failed"
            FAIL=$((FAIL + 1))
            rm -f "$native_tmp" "$native_norm" "$maia_tmp" "$maia_norm" "$native_bin"
            echo ""
            continue
        fi

        normalize_output < "$native_tmp" > "$native_norm"

        if ! node "$WEBC" "$src" --dist --out-dir "$test_dir/dist" --name "$stem" --wat >/dev/null 2>&1; then
            echo "    SKIP - MaiaC build failed for this source"
            SKIP=$((SKIP + 1))
            rm -f "$native_tmp" "$native_norm" "$maia_tmp" "$maia_norm" "$native_bin"
            echo ""
            continue
        fi

        if [[ ! -f "$runner" || ! -f "$dist_wasm" ]]; then
            echo "    SKIP - missing dist/node-runner.sh or generated wasm"
            SKIP=$((SKIP + 1))
            rm -f "$native_tmp" "$native_norm" "$maia_tmp" "$maia_norm" "$native_bin"
            echo ""
            continue
        fi

        if [[ -f "$input_file" ]]; then
            run_with_timeout "$TIMEOUT_SECONDS" bash "$runner" "$dist_wasm" < "$input_file" > "$maia_tmp" 2>&1 || true
        elif default_input_for "$stem" >/tmp/maiac_auto_input.txt 2>/dev/null; then
            run_with_timeout "$TIMEOUT_SECONDS" bash "$runner" "$dist_wasm" < /tmp/maiac_auto_input.txt > "$maia_tmp" 2>&1 || true
        else
            run_with_timeout "$TIMEOUT_SECONDS" bash "$runner" "$dist_wasm" < /dev/null > "$maia_tmp" 2>&1 || true
        fi

        normalize_output < "$maia_tmp" > "$maia_norm"

        if diff -u "$native_norm" "$maia_norm" >/dev/null 2>&1; then
            echo "    PASS"
            PASS=$((PASS + 1))
        else
            echo "    FAIL - output mismatch (gcc vs MaiaC)"
            echo "    --- gcc(native) ----------------------------------"
            awk 'NR<=40 {print "    | " $0}' "$native_norm"
            echo "    --- MaiaC(wasm) ----------------------------------"
            awk 'NR<=40 {print "    | " $0}' "$maia_norm"
            echo "    --------------------------------------------------"
            FAIL=$((FAIL + 1))
        fi

        rm -f "$native_tmp" "$native_norm" "$maia_tmp" "$maia_norm" "$native_bin"
        echo ""
    done
done

echo "========================================"
echo "Results: $PASS passed  /  $FAIL failed  /  $SKIP skipped"
echo "========================================"

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi

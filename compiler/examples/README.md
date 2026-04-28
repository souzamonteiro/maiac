# MaiaC Examples

This directory contains runnable C89-oriented examples for validating MaiaC behavior and output quality.

## Organization

- `c89-parity/`: New parity-focused examples inspired by classic C89 practice categories (implemented from scratch for this repository).
  - `basics/`: Core language usage, structs, and function pointers.
  - `algorithms/`: Sorting/search examples with deterministic output.
  - `data-structures/`: Minimal data-structure implementations.
  - `programs/`: Small complete programs.
  - `systems/`: Host/platform-oriented examples used to expose unsupported features.
- `suite/`: Existing validation suite used by the project.
- `c89-mini-suite/` and `diagnostic-suite/`: Existing focused test sets.
- Standalone examples at root (for example `test.c`, `test-extern.c`, `vfs_persist_demo.c`) remain available.

## New `c89-parity` examples

- `c89-parity/basics/function_table_demo.c`
- `c89-parity/basics/callback_pipeline_demo.c`
- `c89-parity/basics/function_array_dispatch_demo.c`
- `c89-parity/basics/generic_swap_demo.c`
- `c89-parity/basics/method_style_counter_demo.c`
- `c89-parity/basics/struct_layout_demo.c`
- `c89-parity/algorithms/search_and_sort_demo.c`
- `c89-parity/algorithms/bfs_grid_demo.c`
- `c89-parity/algorithms/factorial_iterative_demo.c`
- `c89-parity/algorithms/factorial_recursive_demo.c`
- `c89-parity/algorithms/merge_sort_demo.c`
- `c89-parity/algorithms/quicksort_demo.c`
- `c89-parity/algorithms/recursive_power_demo.c`
- `c89-parity/algorithms/selection_sort_demo.c`
- `c89-parity/data-structures/stack_array_demo.c`
- `c89-parity/data-structures/linked_list_demo.c`
- `c89-parity/data-structures/queue_ring_demo.c`
- `c89-parity/data-structures/tree_walk_demo.c`
- `c89-parity/programs/ascii_frame_demo.c`
- `c89-parity/programs/palindrome_batch_demo.c`
- `c89-parity/programs/triangle_pattern_demo.c`
- `c89-parity/systems/pthread_counter_demo.c`

## Run one example with MaiaC

From `compiler/examples`:

```bash
../../bin/webc.sh c89-parity/algorithms/search_and_sort_demo.c --run
```

## Compare GCC vs MaiaC

Use:

```bash
bash compare_native_vs_maiac.sh
```

The script:
- builds each `c89-parity` example with `gcc -std=c89`
- builds the same source with MaiaC (`../../bin/webc.sh`)
- executes both
- compares stdout and exit code
- prints a per-example PASS/FAIL report
- continues running even when GCC or MaiaC cannot build an example

## Notes

- Keep outputs deterministic (no randomness/time-based logic) to make parity checks reliable.
- Build failures are also useful: they identify unsupported language/runtime areas that still need implementation.
- If you add new examples under `c89-parity`, they are picked up automatically by the comparison script.

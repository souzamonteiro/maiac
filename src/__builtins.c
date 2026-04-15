#include <stdlib.h>

/*
 * MaiaC does not support inline assembly yet.
 * These wrappers delegate to host-provided imports.
 */
extern int _memory_grow_js(int memory_index, int pages);
extern int _memory_size_js(int memory_index);

size_t __builtin_wasm_memory_grow(size_t memory_index, size_t pages) {
    int previous_pages;
    previous_pages = _memory_grow_js((int)memory_index, (int)pages);
    if (previous_pages < 0) {
        return (size_t)-1;
    }
    return (size_t)previous_pages;
}

size_t __builtin_wasm_memory_size(size_t memory_index) {
    int current_pages;
    current_pages = _memory_size_js((int)memory_index);
    if (current_pages < 0) {
        return 0;
    }
    return (size_t)current_pages;
}
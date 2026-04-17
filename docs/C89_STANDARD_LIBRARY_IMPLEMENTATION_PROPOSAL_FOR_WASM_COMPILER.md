# C89 Standard Library Implementation Proposal for WASM Compiler

## Overview

This document outlines which C89 standard library functions should be implemented **natively within the WASM module** versus **imported from JavaScript**, along with a phased roadmap for implementation.

## Current Implementation Snapshot (2026-04-16)

- Native/WASM libraries produced in `lib/`: `stdlib.wasm`, `string.wasm`, `setjmp.wasm`.
- Runtime JS hosts implemented under `src/runtime/` for math/time/locale/signal/stdio core behavior.
- Browser-like fallback available for stdio through in-memory files (`forceMemoryFiles`) with optional persistence adapter (`memoryFileStore`).
- A synchronous browser persistence adapter is available in `src/runtime/browser-memory-file-store.js` for `localStorage`-style backends.
- Include-driven linked library loading and distribution packaging available via `tools/webc.js --dist` (`tools/create-dist.js` remains as compatibility wrapper).
- `setjmp/longjmp` now supports emulated resume at `setjmp` through host-assisted unwind + pending return capture (`_setjmp_capture_js`/`_longjmp_unwind_js`) with stack/frame restoration.
- `vprintf/vsprintf` host behavior reads `va_list` memory, and end-to-end variadic workflows for stable paths are covered by `compiler/tests/test-stdarg-e2e.js`.

### Header Implementation Status Matrix (2026-04-16)

| Header | Declared in `include/` | Implemented | Where | Status |
|--------|------------------------|-------------|-------|--------|
| `stdio.h` | ✅ | ✅ | `createStdioHosts()` in `c89-js-hosts.js` + `fixedStdIoHostSignatures` in compiler | ✅ Complete |
| `math.h` | ✅ | ✅ | `createMathHosts()` — all 22 functions: `sin/cos/tan/...`, `frexp`, `ldexp`, `modf` | ✅ Complete |
| `time.h` | ✅ | ✅ | `createTimeHosts()` — `clock`, `time`, `localtime`, `gmtime`, `mktime`, `strftime`, `asctime`, `ctime`, `difftime` | ✅ Complete |
| `string.h` | ✅ | ✅ | `src/string.c` compiled to `string.wasm` (native WASM) | ✅ Complete |
| `stdlib.h` | ✅ | ✅ | `src/stdlib.c` compiled to `stdlib.wasm` (native WASM) + JS hosts (`exit`, `getenv`, `abort`) | ✅ Complete |
| `setjmp.h` | ✅ | ⚠️ | `src/setjmp.wat` + runtime hooks — captures/restores `__stack_ptr`/`__frame_ptr` and provides emulated `setjmp` resume via reentry | ⚠️ Partial |
| `locale.h` | ✅ | ✅ | `createLocaleHosts()` — functional stubs | ✅ Stubs OK |
| `signal.h` | ✅ | ✅ | `createSignalHosts()` — basic mapping | ✅ Stubs OK |
| `stdarg.h` | ✅ | ⚠️ | Header + compiler variadic packing + runtime `vprintf`/`vsprintf` `va_list` walker with E2E tests for stable paths (`test-stdarg-e2e.js`) | ⚠️ Partial |
| `ctype.h` | ✅ | ✅ | `src/ctype.c` compiled to `lib/ctype.wasm`; all 13 functions declared as `env` imports in compiler | ✅ Complete |
| `stddef.h` | ✅ | ✅ | Macros only (`NULL`, `size_t`, `ptrdiff_t`) | ✅ Header-only |
| `limits.h` | ✅ | ✅ | `#define` constants only | ✅ Header-only |
| `float.h` | ✅ | ✅ | `#define` constants only | ✅ Header-only |
| `errno.h` | ✅ | ✅ | `#define` codes + `extern int errno` stub | ✅ Header-only |
| `assert.h` | ✅ | ✅ | Macros only | ✅ Header-only |

### Known Implementation Gaps

#### `stdarg.h` — partial only

`stdarg.h` supports stable end-to-end flows (covered in `compiler/tests/test-stdarg-e2e.js`), but some variadic edge cases still need hardening in the compiler pipeline.

#### `setjmp.h` — bootstrap only

`setjmp`/`longjmp` are exported via `src/setjmp.wat` and now support an emulated resume path: `longjmp` schedules a pending return value, unwinds, and the next reentry consumes that value at `setjmp`. This still depends on host unwind/reentry (not a true low-level in-WASM continuation).

### Browser VFS Persistence Note

- Current `memoryFileStore` hooks are synchronous (`load/save/remove/rename`).
- This fits `localStorage` and in-memory `Map` adapters directly.
- `IndexedDB` is naturally asynchronous, so a true IndexedDB-backed VFS will require either:
    - an async host API surface for stdio persistence, or
    - an app-level preload/snapshot layer that hydrates `memoryFiles` before execution and flushes after execution.

## Design Philosophy

| Implementation Location | Rationale |
|------------------------|-----------|
| **Native WASM** | Performance-critical, memory-manipulating, or requiring stack access |
| **JavaScript import** | I/O operations, system interactions, environment queries, or math functions |

## Classification

### Tier 1: Must Implement Natively (WASM)

These functions cannot be efficiently or correctly implemented via JavaScript imports.

#### Memory Management (`<stdlib.h>`)

| Function | Reason |
|----------|--------|
| `malloc(size_t size)` | Memory allocator operating on WASM linear memory |
| `free(void *ptr)` | Paired with malloc, requires internal heap management |
| `calloc(size_t nmemb, size_t size)` | Wrapper around malloc + zero-initialization |
| `realloc(void *ptr, size_t size)` | Resize allocation in-place or move |

#### String & Memory Operations (`<string.h>`)

| Function | Reason |
|----------|--------|
| `memcpy`, `memmove`, `memset`, `memcmp` | Byte-level memory operations called frequently |
| `strcpy`, `strncpy`, `strcat`, `strncat` | String copy/concatenate, per-byte overhead too high |
| `strlen`, `strcmp`, `strncmp`, `strcoll` | Linear scans — JS calls would be disastrous |
| `strchr`, `strrchr`, `strstr`, `strpbrk` | Search operations requiring per-character loops |
| `strcspn`, `strspn`, `strtok` | Tokenization and span operations |
| `memchr` | Linear memory search |

#### Non-Local Jumps (`<setjmp.h>`)

| Function | Reason |
|----------|--------|
| `setjmp(jmp_buf env)` | Requires saving WASM stack/frame pointers |
| `longjmp(jmp_buf env, int val)` | Unwinds stack — JS has no access to WASM call stack |

#### Sorting & Searching (`<stdlib.h>`)

| Function | Reason |
|----------|--------|
| `qsort(void *base, ...)` | Comparison callback called repeatedly — JS overhead prohibitive |
| `bsearch(...)` | Same callback issue |

#### Pseudo-Random Numbers (`<stdlib.h>`)

| Function | Reason |
|----------|--------|
| `rand(void)` | Trivial to implement, avoid JS call overhead |
| `srand(unsigned int seed)` | Paired with rand |

### Tier 2: Can Import from JavaScript

These functions map naturally to browser or Node.js APIs.

#### Input/Output (`<stdio.h>`)

| Function | JS Mapping |
|----------|------------|
| `fopen(filename, mode)` | `fetch()` / `fs.readFileSync()` / `localStorage` |
| `fread(ptr, size, nmemb, stream)` | Read into WASM memory |
| `fwrite(ptr, size, nmemb, stream)` | Write from WASM memory |
| `fclose(stream)` | Close handle |
| `fflush(stream)` | Flush buffers |
| `printf`, `fprintf`, `sprintf` | May need partial native for formatting; can delegate console output to JS |
| `scanf`, `fscanf`, `sscanf` | Complex — may keep native parser, only I/O calls go to JS |
| `remove()`, `rename()` | `fs.unlinkSync()`, `fs.renameSync()` |
| `tmpfile()`, `tmpnam()` | Create temp files via JS |

#### Date & Time (`<time.h>`)

| Function | JS Mapping |
|----------|------------|
| `time(time_t *timer)` | `Date.now() / 1000` |
| `clock(void)` | `performance.now()` |
| `difftime(time1, time0)` | Simple subtraction (can be native) |
| `localtime(timer)` | `new Date()` conversion |
| `gmtime(timer)` | UTC conversion |
| `mktime(struct tm *)` | Reverse conversion |
| `asctime()`, `ctime()` | String formatting (can be native wrapper) |
| `strftime()` | Complex — may keep native, only date source from JS |

#### Environment (`<stdlib.h>`)

| Function | JS Mapping |
|----------|------------|
| `system(const char *string)` | `eval()` or Node `child_process.execSync()` |
| `getenv(const char *name)` | `process.env[name]` (Node) or `localStorage` (browser) |
| `abort()` | `throw` or `process.exit()` |
| `exit(int status)` | Terminate module |
| `atexit(void (*func)(void))` | Register cleanup (requires internal callback table) |

#### Mathematics (`<math.h>`)

| Function | JS Mapping |
|----------|------------|
| `sin`, `cos`, `tan`, `asin`, `acos`, `atan` | `Math.sin`, etc. |
| `sinh`, `cosh`, `tanh` | `Math.sinh`, etc. (ES2015+) |
| `exp`, `log`, `log10`, `pow`, `sqrt` | `Math.exp`, `Math.log`, `Math.pow`, `Math.sqrt` |
| `ceil`, `floor`, `fabs`, `fmod` | `Math.ceil`, `Math.floor`, `Math.abs`, `%` operator |
| `frexp`, `ldexp`, `modf` | Need native implementation (no direct JS equivalent) |

#### Localization (`<locale.h>`)

| Function | JS Mapping |
|----------|------------|
| `setlocale(category, locale)` | `Intl` API or ignore (stub) |
| `localeconv(void)` | Return static struct with defaults |

#### Signals (`<signal.h>`)

| Function | JS Mapping |
|----------|------------|
| `signal(sig, func)` | Map to JS `addEventListener` where possible |
| `raise(sig)` | Trigger corresponding JS event |

### Tier 3: Special Cases

| Function | Recommended Approach |
|----------|----------------------|
| `vprintf`, `vsprintf` (`<stdio.h>`) | Native formatting + JS output |
| `perror` (`<stdio.h>`) | Native string + JS console |
| `strerror` (`<string.h>`) | Native string table (no JS needed) |
| `mblen`, `mbtowc`, `wctomb`, `mbstowcs`, `wcstombs` (`<stdlib.h>`) | Stub or limited UTF-8 handling (can be native) |

## Phased Roadmap

### Phase 0: Foundation (Week 1)
- [x] `malloc` / `free` — Simple free-list or bump allocator with free list
- [x] `memcpy`, `memset`, `memmove`, `memcmp`
- [x] `strlen`, `strcmp`, `strcpy`
- [x] `rand` / `srand` — LCG implementation

### Phase 1: Strings (Week 2)
- [x] `strncpy`, `strcat`, `strncat`, `strncmp`
- [x] `strchr`, `strrchr`, `strstr`
- [x] `strtok`, `strcspn`, `strspn`, `strpbrk`
- [x] `strerror` — Static error message table

### Phase 2: Advanced Memory (Week 3)
- [x] `calloc`, `realloc`
- [x] `qsort` — Quick sort implementation
- [x] `bsearch` — Binary search

### Phase 3: Non-Local Jumps (Week 4)
- [~] `setjmp` / `longjmp` — Bootstrap + emulated resume implementation exported in `setjmp.wasm`
- [ ] Full integration with WAT `__stack_pointer`/frame restoration semantics

### Phase 4: I/O (Week 5)
- [~] `printf` family — `printf`, `fprintf`, `sprintf` complete; `vprintf`/`vsprintf` validated for stable `va_list` flows with remaining edge cases
- [x] `fopen`, `fclose`, `fread`, `fwrite` — JS imports
- [x] `fflush`, `remove`, `rename`
- [x] `perror`

### Phase 5: Time & Environment (Week 6)
- [x] `time`, `clock`, `difftime` — JS imports + native wrappers
- [x] `localtime`, `gmtime`, `mktime` — JS imports
- [x] `strftime` — Native formatter using JS time source
- [x] `system`, `getenv`, `abort`, `exit` — JS imports

### Phase 6: Math & Locale (Week 7)
- [x] Math functions — JS imports including `frexp`/`ldexp`/`modf`
- [x] `setlocale`, `localeconv` — Stubs
- [x] Signal handlers — Basic JS event mapping

### Phase 7: Polish & Testing (Week 8)
- [x] Wide char functions (`mblen`, `mbstowcs`, etc.) — UTF-8 stubs
- [x] Comprehensive test suite
- [x] Performance benchmarking (native vs. import) — `npm run bench:native-vs-import`

## Technical Notes

### Memory Allocator Design (Simple Free-List)
```c
typedef struct Block {
    size_t size;
    struct Block *next;
    int free;
} Block;

void *malloc(size_t size);
void free(void *ptr);
```

### setjmp/longjmp WAT Approach
- Save `(global.get __stack_pointer)` and `(global.get __frame_pointer)` into `jmp_buf`
- `longjmp` restores and branches back to saved `setjmp` return point

### Import Signature Example
```wat
(import "js" "console_log" (func $console_log (param i32 i32)))
(import "js" "fs_read" (func $fs_read (param i32 i32 i32) (result i32)))
```

## Conclusion

This hybrid approach maximizes performance where it matters (memory, strings, sorting, setjmp) while leveraging JavaScript's strengths for I/O, environment, and math. The phased roadmap allows incremental implementation with working builds after each phase.

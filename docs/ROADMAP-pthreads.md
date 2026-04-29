# ROADMAP: POSIX pthreads Implementation (C89 → WASM)

## Overview

POSIX threads are implemented using WebAssembly 3.0 SMP instructions combined with `SharedArrayBuffer` and `Atomics` for synchronization. The same core implementation works across both Node.js (`worker_threads`) and Browser (Web Workers), with Node.js offering fewer platform restrictions.

---

## Architecture

```
┌─────────────────────────────────────┐
│     POSIX Threads API (C)           │  ← pthread.h
├─────────────────────────────────────┤
│     WASM 3.0 SMP Thread Spawn       │  ← custom assembler support
├──────────────────┬──────────────────┤
│   Node.js        │   Browser        │
│   worker_threads │   Web Workers    │
│   (no COOP/COEP) │   (needs headers)│
└──────────────────┴──────────────────┘
```

All synchronization primitives are built on top of `SharedArrayBuffer` + `Atomics`, which behave identically in both environments. The only difference is platform setup (COOP/COEP headers in the browser).

---

## Environment Comparison

| Feature | Browser (Web Workers) | Node.js (worker_threads) |
|---|---|---|
| Thread spawn | `new Worker(blob)` | `new Worker(__filename, {workerData})` |
| Shared memory | `SharedArrayBuffer` (needs COOP/COEP) | `SharedArrayBuffer` (no restrictions) |
| `Atomics` | ✅ | ✅ |
| `Atomics.waitAsync` | Limited support | ✅ Full |
| Module/filesystem access | Restricted | ✅ Full |
| Debugging | Limited | ✅ Full Node.js tooling |

**Recommendation:** implement and test everything on Node.js first, then validate the browser path.

---

## Memory Layout

### Shared Memory Regions

```
┌──────────────────────────────────────────┐
│  Thread Control Blocks (TCB array)       │  ← one entry per pthread
│    tid, state, join_result, stack_ptr    │
├──────────────────────────────────────────┤
│  Mutex pool (i32 array)                  │  ← 0 = unlocked, 1 = locked
├──────────────────────────────────────────┤
│  Condvar pool (i32 array)                │  ← wait/signal slots
├──────────────────────────────────────────┤
│  Semaphore pool (i32 array)              │  ← counter slots
├──────────────────────────────────────────┤
│  TLS region                              │  ← base + (tid * TLS_SIZE) + offset
│    per-thread block for __thread vars    │
└──────────────────────────────────────────┘
```

### Thread-Local Storage (TLS)

```c
// C declaration
__thread int x;

// WASM memory layout
// address = tls_base + (thread_id * TLS_SIZE) + var_offset
```

Each thread receives a fixed-size TLS block. The compiler assigns `var_offset` statically at compile time.

---

## Implementation Phases

### Phase 1 — Thread Lifecycle

#### `pthread_create`
1. Allocate a Thread Control Block (TCB) slot in shared memory
2. Assign a thread ID (`tid`)
3. Emit WASM 3.0 SMP thread spawn instruction
4. Underlying platform spawns a Worker with access to the same `SharedArrayBuffer`
5. New thread begins executing at the provided function pointer

#### `pthread_join`
```
Atomics.wait(tcb[tid].state, RUNNING)
→ blocks until state transitions to EXITED
→ reads join_result from TCB
→ frees TCB slot
```

#### `pthread_exit`
```
Atomics.store(tcb[tid].state, EXITED)
Atomics.notify(tcb[tid].state, 1)  // wake any joiner
terminate Worker
```

#### `pthread_self`
```
→ returns tid stored in thread-local memory at thread init
```

---

### Phase 2 — Mutexes (`pthread_mutex_t`)

Stored as a single `i32` in the shared mutex pool (`0` = unlocked, `1` = locked).

| Function | Implementation |
|---|---|
| `pthread_mutex_init` | `Atomics.store(slot, 0)` |
| `pthread_mutex_lock` | `Atomics.compareExchange(slot, 0→1)`; if fails → `Atomics.wait(slot, 1)` then retry |
| `pthread_mutex_unlock` | `Atomics.store(slot, 0)` + `Atomics.notify(slot, 1)` |
| `pthread_mutex_trylock` | `Atomics.compareExchange(slot, 0→1)` — returns immediately |
| `pthread_mutex_destroy` | mark slot as free |

Recursive and error-checking mutex types (`PTHREAD_MUTEX_RECURSIVE`, `PTHREAD_MUTEX_ERRORCHECK`) require an additional owner `tid` field and lock-count `i32` next to the lock slot.

---

### Phase 3 — Condition Variables (`pthread_cond_t`)

Stored as an `i32` sequence counter in the condvar pool.

| Function | Implementation |
|---|---|
| `pthread_cond_wait` | release mutex → `Atomics.wait(cond_slot, seq)` → reacquire mutex |
| `pthread_cond_signal` | `Atomics.add(cond_slot, 1)` + `Atomics.notify(cond_slot, 1)` |
| `pthread_cond_broadcast` | `Atomics.add(cond_slot, 1)` + `Atomics.notify(cond_slot, +Infinity)` |
| `pthread_cond_timedwait` | `Atomics.wait(cond_slot, seq, timeout_ms)` |
| `pthread_cond_destroy` | mark slot as free |

---

### Phase 4 — POSIX Semaphores (`sem_t`)

Stored as an `i32` counter in the semaphore pool.

| Function | Implementation |
|---|---|
| `sem_init` | `Atomics.store(slot, initial_value)` |
| `sem_wait` | loop: `Atomics.compareExchange(slot, N→N-1)`; if `N==0` → `Atomics.wait` then retry |
| `sem_post` | `Atomics.add(slot, 1)` + `Atomics.notify(slot, 1)` |
| `sem_trywait` | `Atomics.compareExchange` — returns `EAGAIN` if zero |
| `sem_timedwait` | `Atomics.wait(slot, 0, timeout_ms)` |
| `sem_getvalue` | `Atomics.load(slot)` |
| `sem_destroy` | mark slot as free |

---

### Phase 5 — Thread Attributes (`pthread_attr_t`)

Support for the most commonly used attributes:

| Attribute | Notes |
|---|---|
| Stack size (`pthread_attr_setstacksize`) | Allocate stack region in linear memory |
| Detach state (`pthread_attr_setdetachstate`) | `PTHREAD_CREATE_DETACHED` skips TCB join slot |
| Scheduling policy | Stub — no real scheduler control in WASM |

---

### Phase 6 — Read-Write Locks (`pthread_rwlock_t`)

Can be implemented on top of mutexes and condition variables from Phase 2–3:

- Maintain reader count (`i32`) + writer flag (`i32`) in shared memory
- Writers wait for reader count to reach zero
- Multiple readers can hold the lock simultaneously

---

### Phase 7 — Once Control (`pthread_once_t`)

```c
pthread_once_t once = PTHREAD_ONCE_INIT;

// Implementation:
// Atomics.compareExchange(once_slot, 0→1)
// If winner (old value was 0): execute init_routine, then store DONE
// If loser: Atomics.wait until state == DONE
```

---

## `Atomics.wait` Restriction

`Atomics.wait` **cannot be called on the main thread** in browsers. This affects:

- The main WASM thread calling blocking `pthread_join`, `pthread_mutex_lock`, or `sem_wait`

**Mitigation options:**
1. Run the C program's `main()` inside a Worker from the start (offload main thread entirely)
2. Use `Atomics.waitAsync` on the main thread for non-blocking wait paths
3. Document the restriction and require entry point to be in a Worker context

Node.js does not have this restriction — all threads may call `Atomics.wait` freely.

---

## Implementation Order Summary

1. `SharedArrayBuffer` layout — TCB array, mutex/condvar/sem pools, TLS region
2. `pthread_create` / `pthread_exit` / `pthread_self`
3. `pthread_join` (via `Atomics.wait` on TCB state)
4. `pthread_mutex_init` / `lock` / `unlock` / `trylock` / `destroy`
5. `pthread_cond_wait` / `signal` / `broadcast` / `timedwait`
6. `sem_init` / `sem_wait` / `sem_post` / `sem_trywait`
7. `pthread_attr_t` (stack size, detach state)
8. `pthread_rwlock_t`
9. `pthread_once`
10. Browser path validation + `Atomics.wait` main-thread mitigation

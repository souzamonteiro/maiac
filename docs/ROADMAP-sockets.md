# ROADMAP: POSIX Sockets Implementation (C89 → WASM)

## Overview

POSIX sockets are implemented via a two-layer abstraction that transparently selects the best available backend depending on the runtime environment: **Node.js** (full support via `net`/`dgram`) or **Browser** (partial support via WebSocket shim).

---

## Environment Detection Layer

```
┌─────────────────────────────────┐
│     POSIX Socket API (C)        │  ← sys/socket.h / netdb.h
├─────────────────────────────────┤
│     WASM Abstraction Layer      │  ← detects globalThis vs process
├──────────────┬──────────────────┤
│  Node impl   │   Browser impl   │
│  net/dgram   │   WebSocket shim │
└──────────────┴──────────────────┘
```

The compiler emits different JS imports depending on the detected target:

```javascript
// Node.js
const __sock_impl = require('net');

// Browser
const __sock_impl = { /* WebSocket shim */ };
```

---

## Node.js Backend (Primary — Near-Complete POSIX)

Node.js provides direct mappings via the `net` (TCP) and `dgram` (UDP) modules.

### API Mapping

| POSIX API | Node.js Equivalent |
|---|---|
| `socket()` + `connect()` | `net.createConnection()` |
| `socket()` + `bind()` + `listen()` + `accept()` | `net.createServer()` + `server.listen()` |
| `send()` / `recv()` | `socket.write()` / `socket.on('data')` |
| `SOCK_DGRAM` (UDP) | `dgram.createSocket('udp4')` |
| `close()` | `socket.destroy()` |
| `getaddrinfo()` | `dns.lookup()` |
| `select()` / `poll()` | Native `EventEmitter` |

### Blocking `recv()` Strategy (Node.js)

Use a dedicated thread per socket with `SharedArrayBuffer` as a circular rx buffer:

1. JS writes incoming data into `SharedArrayBuffer` ring buffer on `socket.on('data')`
2. WASM thread blocks via `Atomics.wait()` on the buffer's head pointer
3. Thread wakes, copies data, returns from `recv()`

Node.js has no `SharedArrayBuffer` restrictions (no COOP/COEP headers required), making this straightforward to implement.

---

## Browser Backend (Partial — Client Only)

The browser backend uses WebSocket as the underlying transport. Since browsers cannot act as TCP servers, only client-side stream sockets are supported.

### API Mapping

| POSIX API | Browser Equivalent |
|---|---|
| `connect()` | `new WebSocket(url)` |
| `send()` | `ws.send()` |
| `recv()` | `ws.onmessage` + `SharedArrayBuffer` |
| `close()` | `ws.close()` |
| `select()` | `Atomics.waitAsync` on multiple fd slots |

### Blocking `recv()` Strategy (Browser)

Same `SharedArrayBuffer` + `Atomics.wait()` mechanism as Node.js, using a dedicated pthread per socket (once pthreads are implemented):

1. `WebSocket.onmessage` writes data into shared rx ring buffer
2. WASM thread (pthread) blocks on `Atomics.wait()` on the head pointer
3. Thread resumes, copies data, returns from `recv()`

**Note:** `SharedArrayBuffer` in browsers requires the page to be served with `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers.

---

## Internal File Descriptor Table

A shared-memory fd table maps C file descriptors to internal socket state:

```c
typedef struct {
    int  type;                  // SOCK_STREAM or SOCK_DGRAM
    int  state;                 // CONNECTING, OPEN, CLOSED
    int  js_handle;             // index into JS-side WebSocket/net.Socket array
    int  rx_head, rx_tail;      // circular buffer pointers
    char rx_buf[RX_BUF_SIZE];   // receive ring buffer (in shared memory)
} __wasm_socket_t;
```

### JS Glue Imports (WASM ↔ JS)

```javascript
const socketImports = {
  __ws_connect(fd, urlPtr, urlLen)  { ... },
  __ws_send(fd, bufPtr, len)        { ... },
  __ws_close(fd)                    { ... },
  __ws_poll(fd)                     { ... },  // returns available bytes
};
```

---

## Implementation Phases

### Phase 1 — fd Table + JS Glue
- Allocate and manage fd table in shared memory
- Implement JS-side socket object registry
- Wire up `__ws_connect`, `__ws_send`, `__ws_close`, `__ws_poll` imports

### Phase 2 — Core Stream API (Node first)
- `socket()` — allocate fd entry
- `connect()` — call JS glue + `Atomics.wait(state == OPEN)`
- `send()` — call `__ws_send()` (non-blocking on JS side)
- `recv()` — `Atomics.wait` on rx ring buffer
- `close()` — call `__ws_close()` + free fd

### Phase 3 — Server API (Node only)
- `bind()` — bind address/port on Node `net.Server`
- `listen()` — `server.listen()`
- `accept()` — block until new connection, allocate new fd

### Phase 4 — UDP (Node only)
- `SOCK_DGRAM` via `dgram.createSocket('udp4')`
- `sendto()` / `recvfrom()` with address capture

### Phase 5 — Multiplexing
- `select()` — poll multiple fd slots with timeout via `Atomics.waitAsync`
- `poll()` — same mechanism, different API surface

### Phase 6 — Name Resolution
- `getaddrinfo()` → `dns.lookup()` shim (Node)
- `getaddrinfo()` → restricted shim or compile-time error (Browser)

---

## Known Limitations

| Feature | Node.js | Browser |
|---|---|---|
| TCP client | ✅ Full | ✅ Via WebSocket |
| TCP server (`bind`/`listen`/`accept`) | ✅ Full | ❌ Not possible |
| UDP (`SOCK_DGRAM`) | ✅ Full | ❌ Not supported (WebTransport future) |
| Raw sockets | ❌ | ❌ |
| `fcntl()` `O_NONBLOCK` | ⚠️ Implementable | ⚠️ Requires care |
| `getaddrinfo()` DNS | ✅ `dns.lookup()` | ⚠️ Restricted |
| `SharedArrayBuffer` setup | ✅ No restrictions | ⚠️ Requires COOP/COEP headers |

---

## Implementation Order Summary

1. Shared memory fd table layout
2. JS glue layer + environment detection
3. `connect()` / `send()` / `close()` (Node)
4. `recv()` blocking via `SharedArrayBuffer` + `Atomics.wait`
5. `bind()` / `listen()` / `accept()` (Node)
6. UDP via `dgram` (Node)
7. `select()` / `poll()` via `Atomics.waitAsync`
8. `getaddrinfo()` shim
9. Browser WebSocket shim + documented limitations

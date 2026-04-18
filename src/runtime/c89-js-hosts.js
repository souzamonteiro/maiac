'use strict';

const fs = (() => {
  try {
    return require('fs');
  } catch (_error) {
    return null;
  }
})();

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8');
let requiredSprintf = null;
let requiredParseFormatSpec = null;

try {
  const sprintfMod = require('./sprintf.js');
  requiredSprintf = sprintfMod.sprintf;
  requiredParseFormatSpec = sprintfMod.parseFormatSpec;
} catch (_error) {
  requiredSprintf = null;
  requiredParseFormatSpec = null;
}

function alignUp(value, align) {
  const a = align > 0 ? align : 1;
  return ((value + a - 1) / a | 0) * a;
}

function getRuntimeSprintf() {
  if (typeof sprintf === 'function') {
    return sprintf;
  }
  return requiredSprintf;
}

function getRuntimeParseFormatSpec() {
  if (typeof parseFormatSpec === 'function') {
    return parseFormatSpec;
  }
  return requiredParseFormatSpec;
}

function extractFormatSpecifiers(format) {
  const parseSpec = getRuntimeParseFormatSpec();
  if (!parseSpec) {
    return [];
  }

  const text = String(format || '');
  const specs = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] !== '%') {
      i += 1;
      continue;
    }

    if (text[i + 1] === '%') {
      i += 2;
      continue;
    }

    const spec = parseSpec(text, i + 1);
    if (!spec || !spec.type) {
      i += 1;
      continue;
    }

    specs.push(spec);
    i = spec.end + 1;
  }

  return specs;
}

function resolveFormatArgs(mem, format, rawArgs) {
  const specs = extractFormatSpecifiers(format);
  const resolved = [];
  let rawIndex = 0;

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];

    if (spec.widthFromArg) {
      resolved.push(Number(rawArgs[rawIndex++] || 0));
    }
    if (spec.precisionFromArg) {
      resolved.push(Number(rawArgs[rawIndex++] || 0));
    }

    const type = spec.type;
    const raw = Number(rawArgs[rawIndex++] || 0);

    if (type === 's') {
      resolved.push(mem.readCString(Math.trunc(raw) >>> 0));
      continue;
    }

    if (type === 'c') {
      resolved.push((Math.trunc(raw) | 0) & 0xFF);
      continue;
    }

    if (type === 'd' || type === 'i') {
      resolved.push(Math.trunc(raw) | 0);
      continue;
    }

    if ('uoxXp'.indexOf(type) !== -1) {
      resolved.push(Math.trunc(raw) >>> 0);
      continue;
    }

    resolved.push(raw);
  }

  return resolved;
}

function createRuntimeAllocator(getMemory) {
  let top = 0;

  function ensureCapacity(bytes) {
    const memory = getMemory();
    if (!memory) return 0;

    if (top === 0) {
      top = memory.buffer.byteLength;
    }

    if (top + bytes > memory.buffer.byteLength) {
      const missing = top + bytes - memory.buffer.byteLength;
      const pages = Math.ceil(missing / 65536);
      memory.grow(pages);
    }

    return 1;
  }

  function alloc(bytes, align = 4) {
    if (!ensureCapacity(bytes + align)) return 0;
    top = alignUp(top, align);
    const ptr = top;
    top += bytes;
    return ptr;
  }

  return { alloc };
}

function createMemoryAccess(getMemory) {
  function view() {
    const memory = getMemory();
    if (!memory) return null;
    return new DataView(memory.buffer);
  }

  function u8() {
    const memory = getMemory();
    if (!memory) return null;
    return new Uint8Array(memory.buffer);
  }

  function readI32(ptr) {
    const v = view();
    if (!v || !ptr) return 0;
    return v.getInt32(ptr >>> 0, true);
  }

  function writeI32(ptr, value) {
    const v = view();
    if (!v || !ptr) return;
    v.setInt32(ptr >>> 0, value | 0, true);
  }

  function writeI8(ptr, value) {
    const v = view();
    if (!v || !ptr) return;
    v.setInt8(ptr >>> 0, value | 0);
  }

  function readF64(ptr) {
    const v = view();
    if (!v || !ptr) return 0;
    return v.getFloat64(ptr >>> 0, true);
  }

  function writeF64(ptr, value) {
    const v = view();
    if (!v || !ptr) return;
    v.setFloat64(ptr >>> 0, Number(value), true);
  }

  function readBytes(ptr, len) {
    const bytes = u8();
    if (!bytes || !ptr || len <= 0) return new Uint8Array(0);
    const offset = ptr >>> 0;
    const end = Math.min(bytes.length, offset + (len | 0));
    return bytes.subarray(offset, end);
  }

  function writeBytes(ptr, src, len) {
    const bytes = u8();
    if (!bytes || !ptr || !src || len <= 0) return 0;
    const offset = ptr >>> 0;
    const n = Math.min(len | 0, src.length, bytes.length - offset);
    if (n <= 0) return 0;
    bytes.set(src.subarray(0, n), offset);
    return n;
  }

  function readCString(ptr) {
    const bytes = u8();
    if (!bytes || !ptr) return '';
    const offset = ptr >>> 0;
    let end = offset;
    while (end < bytes.length && bytes[end] !== 0) {
      end += 1;
    }
    return textDecoder.decode(bytes.subarray(offset, end));
  }

  function writeCString(ptr, text, maxBytes) {
    const bytes = u8();
    if (!bytes || !ptr) return 0;

    const encoded = textEncoder.encode(String(text || ''));
    const offset = ptr >>> 0;
    const limit = maxBytes == null ? (bytes.length - offset) : Math.max(0, maxBytes | 0);

    if (limit <= 0) {
      return 0;
    }

    const writeLen = Math.min(encoded.length, Math.max(0, limit - 1));
    bytes.set(encoded.subarray(0, writeLen), offset);
    bytes[offset + writeLen] = 0;
    return writeLen;
  }

  return {
    readI32,
    writeI32,
    writeI8,
    readF64,
    writeF64,
    readBytes,
    writeBytes,
    readCString,
    writeCString
  };
}

function createCStringStore(getMemory, allocator, mem) {
  const cache = new Map();

  function intern(text) {
    const key = String(text || '');
    if (cache.has(key)) {
      return cache.get(key);
    }

    const encoded = textEncoder.encode(key);
    const ptr = allocator.alloc(encoded.length + 1, 1);
    if (!ptr) {
      return 0;
    }

    mem.writeCString(ptr, key, encoded.length + 1);
    cache.set(key, ptr);
    return ptr;
  }

  return { intern };
}

function createMathHosts(getMemory) {
  const mem = createMemoryAccess(getMemory);

  function frexp(value, expPtr) {
    const x = Number(value);
    if (x === 0 || !Number.isFinite(x)) {
      if (expPtr) mem.writeI32(expPtr, 0);
      return x;
    }

    const absx = Math.abs(x);
    const exponent = Math.floor(Math.log2(absx)) + 1;
    const mantissa = x / Math.pow(2, exponent);
    if (expPtr) mem.writeI32(expPtr, exponent);
    return mantissa;
  }

  function modf(value, iptr) {
    const x = Number(value);
    if (!Number.isFinite(x)) {
      if (iptr) mem.writeF64(iptr, x);
      return Number.isNaN(x) ? NaN : (x < 0 ? -0 : 0);
    }

    const iPart = x < 0 ? Math.ceil(x) : Math.floor(x);
    const frac = x - iPart;
    if (iptr) mem.writeF64(iptr, iPart);
    return frac;
  }

  return {
    sin: (x) => Math.sin(Number(x)),
    cos: (x) => Math.cos(Number(x)),
    tan: (x) => Math.tan(Number(x)),
    asin: (x) => Math.asin(Number(x)),
    acos: (x) => Math.acos(Number(x)),
    atan: (x) => Math.atan(Number(x)),
    atan2: (y, x) => Math.atan2(Number(y), Number(x)),
    sinh: (x) => Math.sinh(Number(x)),
    cosh: (x) => Math.cosh(Number(x)),
    tanh: (x) => Math.tanh(Number(x)),
    exp: (x) => Math.exp(Number(x)),
    log: (x) => Math.log(Number(x)),
    log10: (x) => Math.log10(Number(x)),
    pow: (x, y) => Math.pow(Number(x), Number(y)),
    sqrt: (x) => Math.sqrt(Number(x)),
    ceil: (x) => Math.ceil(Number(x)),
    floor: (x) => Math.floor(Number(x)),
    fabs: (x) => Math.abs(Number(x)),
    fmod: (x, y) => Number(y) === 0 ? NaN : (Number(x) % Number(y)),
    ldexp: (x, exp) => Number(x) * Math.pow(2, Number(exp) | 0),
    frexp,
    modf
  };
}

function createStdioHosts(getMemory, allocator, cstr, opts = {}) {
  const mem = createMemoryAccess(getMemory);
  const hostFs = opts.forceMemoryFiles ? null : fs;
  const memoryFiles = opts.memoryFiles instanceof Map ? opts.memoryFiles : new Map();
  const memoryFileStore = opts.memoryFileStore || null;
  const write = typeof opts.write === 'function' ? opts.write : (text) => {
    if (typeof process !== 'undefined' && process.stdout && process.stdout.write) {
      process.stdout.write(String(text));
    }
  };

  const readLine = (() => {
    if (typeof opts.readLine === 'function') return opts.readLine;

    // Node fallback: consume stdin once and serve lines synchronously.
    if (typeof process !== 'undefined' && fs && typeof fs.readFileSync === 'function') {
      let stdinText = null;
      let cursor = 0;
      let reachedEof = false;

      return () => {
        if (reachedEof) return null;
        if (stdinText == null) {
          try {
            stdinText = String(fs.readFileSync(0, 'utf8') || '');
          } catch (_error) {
            stdinText = '';
          }
        }

        if (cursor >= stdinText.length) {
          reachedEof = true;
          return null;
        }

        const nextNl = stdinText.indexOf('\n', cursor);
        if (nextNl < 0) {
          const tail = stdinText.slice(cursor).replace(/\r$/, '');
          cursor = stdinText.length;
          return tail;
        }

        const line = stdinText.slice(cursor, nextNl).replace(/\r$/, '');
        cursor = nextNl + 1;
        return line;
      };
    }

    // Browser/unknown host fallback: no stdin source.
    return () => null;
  })();

  let nextHandle = 4;
  const streams = new Map();
  const tempFiles = [];

  streams.set(1, { kind: 'stdin', buffer: '', pos: 0, err: 0, eof: 0 });
  streams.set(2, { kind: 'stdout', err: 0, eof: 0 });
  streams.set(3, { kind: 'stderr', err: 0, eof: 0 });

  function getStream(handle) {
    return streams.get(handle | 0) || null;
  }

  function modeToFlags(mode) {
    const m = String(mode || 'r');
    if (m.indexOf('+') !== -1) {
      if (m.indexOf('a') !== -1) return 'a+';
      if (m.indexOf('w') !== -1) return 'w+';
      return 'r+';
    }
    if (m.indexOf('a') !== -1) return 'a';
    if (m.indexOf('w') !== -1) return 'w';
    return 'r';
  }

  function parseMemoryMode(mode) {
    const m = String(mode || 'r');
    const hasPlus = m.indexOf('+') !== -1;
    return {
      read: hasPlus || m.indexOf('r') !== -1,
      write: hasPlus || m.indexOf('w') !== -1 || m.indexOf('a') !== -1,
      append: m.indexOf('a') !== -1,
      truncate: m.indexOf('w') !== -1,
      create: hasPlus || m.indexOf('w') !== -1 || m.indexOf('a') !== -1
    };
  }

  function cloneBytes(bytes) {
    if (!bytes) return new Uint8Array(0);
    if (bytes instanceof Uint8Array) return bytes.slice();
    return new Uint8Array(bytes);
  }

  function loadMemoryFile(name) {
    if (!name) return null;
    if (memoryFiles.has(name)) {
      return cloneBytes(memoryFiles.get(name));
    }

    if (memoryFileStore && typeof memoryFileStore.load === 'function') {
      const loaded = memoryFileStore.load(name);
      if (loaded) {
        const data = cloneBytes(loaded);
        memoryFiles.set(name, cloneBytes(data));
        return data;
      }
    }

    return null;
  }

  function flushMemfile(stream) {
    if (!stream || stream.kind !== 'memfile' || !stream.path) {
      return;
    }
    {
      const persisted = cloneBytes(stream.data);
      memoryFiles.set(stream.path, persisted);
      if (memoryFileStore && typeof memoryFileStore.save === 'function') {
        memoryFileStore.save(stream.path, cloneBytes(persisted));
      }
    }
  }

  function fopen(filenamePtr, modePtr) {
    const filename = mem.readCString(filenamePtr);
    const mode = mem.readCString(modePtr);
    const handle = nextHandle++;

    if (!filename) return 0;

    if (hostFs) {
      try {
        const flags = modeToFlags(mode);
        const fd = hostFs.openSync(filename, flags);
        streams.set(handle, { kind: 'file', fd, path: filename, pos: 0, err: 0, eof: 0, mode: flags });
        return handle;
      } catch (_error) {
        return 0;
      }
    }

    {
      const modeInfo = parseMemoryMode(mode);
      const existing = loadMemoryFile(filename);

      if (!existing && !modeInfo.create && modeInfo.read) {
        return 0;
      }

      let data = cloneBytes(existing);
      if (modeInfo.truncate) {
        data = new Uint8Array(0);
      }

      const pos = modeInfo.append ? data.length : 0;
      streams.set(handle, {
        kind: 'memfile',
        path: filename,
        data,
        pos,
        err: 0,
        eof: 0,
        mode: modeInfo
      });

      if (modeInfo.create && !memoryFiles.has(filename)) {
        memoryFiles.set(filename, cloneBytes(data));
      }
    }

    return handle;
  }

  function fclose(streamPtr) {
    const s = getStream(streamPtr);
    if (!s) return -1;
    if (s.kind === 'file' && hostFs && s.fd != null) {
      try {
        hostFs.closeSync(s.fd);
      } catch (_error) {
      }
    }
    if (s.kind === 'memfile') {
      flushMemfile(s);
    }

    if ((streamPtr | 0) > 3) {
      streams.delete(streamPtr | 0);
    }
    return 0;
  }

  function fflush(streamPtr) {
    if (!streamPtr) return 0;
    const s = getStream(streamPtr);
    if (!s) return -1;
    if (s.kind === 'memfile') {
      flushMemfile(s);
    }
    return 0;
  }

  function fread(ptr, size, nmemb, streamPtr) {
    const s = getStream(streamPtr);
    const total = (size | 0) * (nmemb | 0);
    if (!s || total <= 0) return 0;

    if (s.kind === 'file' && hostFs) {
      try {
        const buf = Buffer.alloc(total);
        const bytes = hostFs.readSync(s.fd, buf, 0, total, s.pos);
        s.pos += bytes;
        if (bytes < total) s.eof = 1;
        mem.writeBytes(ptr, new Uint8Array(buf.subarray(0, bytes)), bytes);
        return ((size | 0) > 0) ? ((bytes / (size | 0)) | 0) : 0;
      } catch (_error) {
        s.err = 1;
        return 0;
      }
    }

    if (s.kind === 'memfile') {
      const available = Math.max(0, s.data.length - s.pos);
      const bytes = Math.min(total, available);
      mem.writeBytes(ptr, s.data.subarray(s.pos, s.pos + bytes), bytes);
      s.pos += bytes;
      if (bytes < total) s.eof = 1;
      return ((size | 0) > 0) ? ((bytes / (size | 0)) | 0) : 0;
    }

    return 0;
  }

  function fwrite(ptr, size, nmemb, streamPtr) {
    const s = getStream(streamPtr);
    const total = (size | 0) * (nmemb | 0);
    if (!s || total <= 0) return 0;

    const bytes = mem.readBytes(ptr, total);

    if (s.kind === 'stdout') {
      write(textDecoder.decode(bytes));
      return nmemb | 0;
    }

    if (s.kind === 'stderr') {
      write(textDecoder.decode(bytes));
      return nmemb | 0;
    }

    if (s.kind === 'file' && hostFs) {
      try {
        // In append mode, pass null position so Node uses O_APPEND (avoids overwriting on explicit pos)
        const isAppend = typeof s.mode === 'string' && s.mode.indexOf('a') !== -1;
        const written = hostFs.writeSync(s.fd, Buffer.from(bytes), 0, bytes.length, isAppend ? null : s.pos);
        s.pos += written;
        return ((size | 0) > 0) ? ((written / (size | 0)) | 0) : 0;
      } catch (_error) {
        s.err = 1;
        return 0;
      }
    }

    if (s.kind === 'memfile') {
      const newEnd = s.pos + bytes.length;
      if (newEnd > s.data.length) {
        const grown = new Uint8Array(newEnd);
        grown.set(s.data, 0);
        s.data = grown;
      }
      s.data.set(bytes, s.pos);
      s.pos += bytes.length;
      return nmemb | 0;
    }

    return 0;
  }

  function fseek(streamPtr, offset, whence) {
    const s = getStream(streamPtr);
    if (!s) return -1;

    let base = 0;
    if ((whence | 0) === 1) {
      base = s.pos | 0;
    } else if ((whence | 0) === 2) {
      if (s.kind === 'file' && hostFs) {
        try {
          base = hostFs.fstatSync(s.fd).size | 0;
        } catch (_error) {
          base = s.pos | 0;
        }
      } else if (s.kind === 'memfile') {
        base = s.data.length | 0;
      }
    }

    s.pos = Math.max(0, base + (offset | 0));
    s.eof = 0;
    return 0;
  }

  function ftell(streamPtr) {
    const s = getStream(streamPtr);
    if (!s) return -1;
    return s.pos | 0;
  }

  function rewind(streamPtr) {
    fseek(streamPtr, 0, 0);
    const s = getStream(streamPtr);
    if (s) {
      s.err = 0;
      s.eof = 0;
    }
  }

  function clearerr(streamPtr) {
    const s = getStream(streamPtr);
    if (!s) return;
    s.err = 0;
    s.eof = 0;
  }

  function feof(streamPtr) {
    const s = getStream(streamPtr);
    return s ? (s.eof | 0) : 0;
  }

  function ferror(streamPtr) {
    const s = getStream(streamPtr);
    return s ? (s.err | 0) : 1;
  }

  function fgetc(streamPtr) {
    const one = allocator.alloc(1, 1);
    const n = fread(one, 1, 1, streamPtr);
    if (n <= 0) return -1;
    const b = mem.readBytes(one, 1);
    return b.length ? b[0] : -1;
  }

  function fputc(c, streamPtr) {
    const one = allocator.alloc(1, 1);
    mem.writeBytes(one, new Uint8Array([(c | 0) & 0xFF]), 1);
    const n = fwrite(one, 1, 1, streamPtr);
    return n > 0 ? ((c | 0) & 0xFF) : -1;
  }

  function fgets(sPtr, n, streamPtr) {
    const limit = (n | 0);
    if (!sPtr || limit <= 1) return 0;

    let i = 0;
    while (i < limit - 1) {
      const ch = fgetc(streamPtr);
      if (ch < 0) break;
      mem.writeBytes(sPtr + i, new Uint8Array([ch & 0xFF]), 1);
      i += 1;
      if (ch === 10) break;
    }

    if (i === 0) return 0;
    mem.writeBytes(sPtr + i, new Uint8Array([0]), 1);
    return sPtr;
  }

  function fputs(sPtr, streamPtr) {
    const text = mem.readCString(sPtr);
    const bytes = textEncoder.encode(text);
    const buf = allocator.alloc(bytes.length + 1, 1);
    mem.writeBytes(buf, bytes, bytes.length);
    return fwrite(buf, 1, bytes.length, streamPtr) >= 0 ? 0 : -1;
  }

  function formatFromArgs(formatPtr, rawArgs) {
    const runtimeSprintf = getRuntimeSprintf();
    if (!runtimeSprintf) {
      return null;
    }

    const fmt = mem.readCString(formatPtr);
    const args = resolveFormatArgs(mem, fmt, rawArgs);
    return runtimeSprintf(fmt, args);
  }

  function fprintf(streamPtr, formatPtr, a1, a2, a3, a4, a5, a6, a7) {
    const text = formatFromArgs(formatPtr, [a1, a2, a3, a4, a5, a6, a7]);
    let bytes;
    let ptr;

    if (text == null) {
      return 0;
    }

    bytes = textEncoder.encode(text);
    ptr = allocator.alloc(bytes.length + 1, 1);
    if (!ptr) {
      return 0;
    }

    mem.writeBytes(ptr, bytes, bytes.length);
    return fwrite(ptr, 1, bytes.length, streamPtr);
  }

  function sprintfHost(dstPtr, formatPtr, a1, a2, a3, a4, a5, a6, a7) {
    const text = formatFromArgs(formatPtr, [a1, a2, a3, a4, a5, a6, a7]);
    if (text == null || !dstPtr) {
      return 0;
    }
    return mem.writeCString(dstPtr, text);
  }

  // Walk a C va_list (char* pointer into WASM linear memory) collecting args
  // based on format specifiers. C89 promotion rules apply:
  //   - int/uint/char/short and pointers → 4 bytes (i32) in our WASM ABI
  //   - float/double → 8 bytes (f64), promoted per C89 default arg promotion
  function readVaListArgs(fmt, apPtr) {
    const specs = extractFormatSpecifiers(fmt);
    const args = [];
    let ap = apPtr | 0;

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];

      if (spec.widthFromArg) {
        args.push(mem.readI32(ap));
        ap += 4;
      }
      if (spec.precisionFromArg) {
        args.push(mem.readI32(ap));
        ap += 4;
      }

      const type = spec.type;
      if ('fFeEgG'.indexOf(type) !== -1) {
        args.push(mem.readF64(ap));
        ap += 8;
      } else if (type === 's') {
        const ptr = mem.readI32(ap) >>> 0;
        args.push(ptr ? mem.readCString(ptr) : '(null)');
        ap += 4;
      } else {
        // d, i, u, o, x, X, c, p — all 4-byte i32 in our ABI
        args.push(mem.readI32(ap));
        ap += 4;
      }
    }

    return args;
  }

  function vprintf(formatPtr, apPtr) {
    const runtimeSprintf = getRuntimeSprintf();
    if (!runtimeSprintf || !formatPtr) return -1;

    const fmt = mem.readCString(formatPtr);
    const args = readVaListArgs(fmt, apPtr);
    const text = runtimeSprintf(fmt, args);
    write(text);
    return textEncoder.encode(text).length;
  }

  function vsprintfHost(dstPtr, formatPtr, apPtr) {
    const runtimeSprintf = getRuntimeSprintf();
    if (!runtimeSprintf || !formatPtr || !dstPtr) return -1;

    const fmt = mem.readCString(formatPtr);
    const args = readVaListArgs(fmt, apPtr);
    const text = runtimeSprintf(fmt, args);
    return mem.writeCString(dstPtr, text);
  }

  function scanf(formatPtr, a1, a2, a3, a4, a5, a6, a7) {
    if (!formatPtr) return 0;

    const fmt = mem.readCString(formatPtr);
    const targets = [a1, a2, a3, a4, a5, a6, a7];
    const stdin = getStream(1);
    if (!stdin) return 0;

    const readChar = () => {
      if (!stdin.buffer || stdin.pos >= stdin.buffer.length) {
        const line = readLine();
        if (line == null) {
          stdin.eof = 1;
          return -1;
        }
        stdin.buffer = String(line) + '\n';
        stdin.pos = 0;
      }
      if (stdin.pos >= stdin.buffer.length) return -1;
      return stdin.buffer.charCodeAt(stdin.pos++) & 0xFF;
    };

    const unreadChar = (ch) => {
      if (ch < 0) return;
      if (stdin.pos > 0) stdin.pos -= 1;
    };

    const skipInputWhitespace = () => {
      let ch = readChar();
      while (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 11 || ch === 12) {
        ch = readChar();
      }
      return ch;
    };

    const scanInt = () => {
      let ch = skipInputWhitespace();
      let sign = 1;
      let value = 0;
      let hasDigit = 0;

      if (ch === 45) {
        sign = -1;
        ch = readChar();
      } else if (ch === 43) {
        ch = readChar();
      }

      while (ch >= 48 && ch <= 57) {
        hasDigit = 1;
        value = value * 10 + (ch - 48);
        ch = readChar();
      }

      unreadChar(ch);
      if (!hasDigit) return null;
      return sign * value;
    };

    let assigned = 0;
    let targetIndex = 0;
    let i = 0;

    while (i < fmt.length) {
      const c = fmt.charCodeAt(i);

      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12) {
        const ch = skipInputWhitespace();
        unreadChar(ch);
        i += 1;
        continue;
      }

      if (c !== 37) {
        const ch = readChar();
        if (ch !== c) {
          if (ch >= 0) unreadChar(ch);
          break;
        }
        i += 1;
        continue;
      }

      i += 1;
      if (i >= fmt.length) break;
      if (fmt.charCodeAt(i) === 37) {
        const literal = readChar();
        if (literal !== 37) {
          if (literal >= 0) unreadChar(literal);
          break;
        }
        i += 1;
        continue;
      }

      while (i < fmt.length) {
        const fc = fmt.charAt(i);
        if ((fc >= '0' && fc <= '9') || fc === '*' || fc === 'h' || fc === 'l' || fc === 'L') {
          i += 1;
          continue;
        }
        break;
      }
      if (i >= fmt.length) break;

      const spec = fmt.charAt(i);
      if (spec === 'd' || spec === 'i') {
        const targetPtr = targets[targetIndex++] | 0;
        const scanned = scanInt();
        if (scanned == null || !targetPtr) {
          break;
        }
        mem.writeI32(targetPtr, scanned | 0);
        assigned += 1;
      } else {
        break;
      }

      i += 1;
    }

    return assigned | 0;
  }

  function getc(streamPtr) {
    return fgetc(streamPtr);
  }

  function putc(c, streamPtr) {
    return fputc(c, streamPtr);
  }

  function getchar() {
    const stdin = getStream(1);
    if (!stdin) return -1;
    if (!stdin.buffer || stdin.pos >= stdin.buffer.length) {
      const line = readLine();
      if (line == null) {
        stdin.eof = 1;
        return -1;
      }
      stdin.buffer = String(line) + '\n';
      stdin.pos = 0;
    }
    if (stdin.pos >= stdin.buffer.length) return -1;
    const ch = stdin.buffer.charCodeAt(stdin.pos++) & 0xFF;
    return ch;
  }

  function putchar(c) {
    const ch = String.fromCharCode((c | 0) & 0xFF);
    write(ch);
    return (c | 0) & 0xFF;
  }

  function puts(sPtr) {
    write(mem.readCString(sPtr) + '\n');
    return 0;
  }

  function ungetc(c, streamPtr) {
    const s = getStream(streamPtr);
    if (!s || s.pos <= 0) return -1;
    s.pos -= 1;
    return (c | 0) & 0xFF;
  }

  function remove(namePtr) {
    const name = mem.readCString(namePtr);
    if (!name) return -1;

    if (!hostFs) {
      if (!memoryFiles.has(name)) return -1;
      memoryFiles.delete(name);
      if (memoryFileStore && typeof memoryFileStore.remove === 'function') {
        memoryFileStore.remove(name);
      }
      return 0;
    }

    try {
      hostFs.unlinkSync(name);
      return 0;
    } catch (_error) {
      return -1;
    }
  }

  function rename(oldPtr, newPtr) {
    const oldName = mem.readCString(oldPtr);
    const newName = mem.readCString(newPtr);
    if (!oldName || !newName) return -1;

    if (!hostFs) {
      if (!memoryFiles.has(oldName)) return -1;
      const data = memoryFiles.get(oldName);
      memoryFiles.delete(oldName);
      memoryFiles.set(newName, cloneBytes(data));
      if (memoryFileStore && typeof memoryFileStore.rename === 'function') {
        memoryFileStore.rename(oldName, newName);
      } else if (memoryFileStore && typeof memoryFileStore.save === 'function') {
        memoryFileStore.save(newName, cloneBytes(data));
        if (typeof memoryFileStore.remove === 'function') {
          memoryFileStore.remove(oldName);
        }
      }
      return 0;
    }

    try {
      hostFs.renameSync(oldName, newName);
      return 0;
    } catch (_error) {
      return -1;
    }
  }

  function tmpnam(sPtr) {
    const name = `maiac_tmp_${Date.now()}_${Math.floor(Math.random() * 1e9)}.tmp`;
    tempFiles.push(name);
    if (sPtr) {
      mem.writeCString(sPtr, name, 256);
      return sPtr;
    }
    return cstr.intern(name);
  }

  function tmpfile() {
    const namePtr = tmpnam(0);
    const modePtr = cstr.intern("w+");
    return fopen(namePtr, modePtr);
  }

  function perror(sPtr) {
    const prefix = sPtr ? mem.readCString(sPtr) : '';
    const msg = prefix ? `${prefix}: error\n` : 'error\n';
    write(msg);
  }

  return {
    fopen,
    fclose,
    fflush,
    fread,
    fwrite,
    fseek,
    ftell,
    rewind,
    clearerr,
    feof,
    ferror,
    fgetc,
    fgets,
    fputc,
    fputs,
    getc,
    getchar,
    putc,
    putchar,
    puts,
    ungetc,
    remove,
    rename,
    tmpfile,
    tmpnam,
    perror,
    fprintf,
    scanf,
    sprintf: sprintfHost,
    vprintf,
    vsprintf: vsprintfHost
  };
}

function dayOfYear(date, isUTC) {
  const year = isUTC ? date.getUTCFullYear() : date.getFullYear();
  const start = isUTC ? Date.UTC(year, 0, 1) : new Date(year, 0, 1).getTime();
  const now = isUTC ? Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) : new Date(year, date.getMonth(), date.getDate()).getTime();
  return Math.floor((now - start) / 86400000);
}

function formatTmAsctime(tm) {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const wday = weekdays[tm.tm_wday] || '???';
  const mon = months[tm.tm_mon] || '???';
  const mday = String(tm.tm_mday).padStart(2, ' ');
  const hh = String(tm.tm_hour).padStart(2, '0');
  const mm = String(tm.tm_min).padStart(2, '0');
  const ss = String(tm.tm_sec).padStart(2, '0');
  const year = String(tm.tm_year + 1900);
  return `${wday} ${mon} ${mday} ${hh}:${mm}:${ss} ${year}\n`;
}

function readTm(mem, tmPtr) {
  return {
    tm_sec: mem.readI32(tmPtr + 0),
    tm_min: mem.readI32(tmPtr + 4),
    tm_hour: mem.readI32(tmPtr + 8),
    tm_mday: mem.readI32(tmPtr + 12),
    tm_mon: mem.readI32(tmPtr + 16),
    tm_year: mem.readI32(tmPtr + 20),
    tm_wday: mem.readI32(tmPtr + 24),
    tm_yday: mem.readI32(tmPtr + 28),
    tm_isdst: mem.readI32(tmPtr + 32)
  };
}

function writeTm(mem, tmPtr, date, isUTC) {
  const sec = isUTC ? date.getUTCSeconds() : date.getSeconds();
  const min = isUTC ? date.getUTCMinutes() : date.getMinutes();
  const hour = isUTC ? date.getUTCHours() : date.getHours();
  const mday = isUTC ? date.getUTCDate() : date.getDate();
  const mon = isUTC ? date.getUTCMonth() : date.getMonth();
  const year = (isUTC ? date.getUTCFullYear() : date.getFullYear()) - 1900;
  const wday = isUTC ? date.getUTCDay() : date.getDay();
  const yday = dayOfYear(date, isUTC);

  mem.writeI32(tmPtr + 0, sec);
  mem.writeI32(tmPtr + 4, min);
  mem.writeI32(tmPtr + 8, hour);
  mem.writeI32(tmPtr + 12, mday);
  mem.writeI32(tmPtr + 16, mon);
  mem.writeI32(tmPtr + 20, year);
  mem.writeI32(tmPtr + 24, wday);
  mem.writeI32(tmPtr + 28, yday);
  mem.writeI32(tmPtr + 32, -1);
}

function formatStrftime(format, tm) {
  const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdaysLong = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsLong = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function two(n) {
    return String(n | 0).padStart(2, '0');
  }

  let out = '';
  for (let i = 0; i < format.length; i += 1) {
    const ch = format[i];
    if (ch !== '%') {
      out += ch;
      continue;
    }

    i += 1;
    const k = format[i] || '';
    if (k === '%') out += '%';
    else if (k === 'Y') out += String(tm.tm_year + 1900);
    else if (k === 'y') out += two((tm.tm_year + 1900) % 100);
    else if (k === 'm') out += two(tm.tm_mon + 1);
    else if (k === 'd') out += two(tm.tm_mday);
    else if (k === 'H') out += two(tm.tm_hour);
    else if (k === 'M') out += two(tm.tm_min);
    else if (k === 'S') out += two(tm.tm_sec);
    else if (k === 'a') out += weekdaysShort[tm.tm_wday] || '';
    else if (k === 'A') out += weekdaysLong[tm.tm_wday] || '';
    else if (k === 'b') out += monthsShort[tm.tm_mon] || '';
    else if (k === 'B') out += monthsLong[tm.tm_mon] || '';
    else if (k === 'j') out += String(tm.tm_yday + 1).padStart(3, '0');
    else if (k === 'c') out += formatTmAsctime(tm).replace(/\n$/, '');
    else out += k;
  }

  return out;
}

function createTimeHosts(getMemory, allocator, cstr, opts = {}) {
  const nowMs = typeof opts.nowMs === 'function' ? opts.nowMs : () => Date.now();
  const perfNow = typeof opts.perfNow === 'function'
    ? opts.perfNow
    : (() => {
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return () => performance.now();
      }
      return () => nowMs();
    })();

  const mem = createMemoryAccess(getMemory);
  let gmtimePtr = 0;
  let localtimePtr = 0;
  let asctimeBufPtr = 0;

  function readTimeArg(timerPtr) {
    if (!timerPtr) {
      return Math.floor(nowMs() / 1000);
    }
    return mem.readI32(timerPtr);
  }

  function ensureTmPtr(kind) {
    if (kind === 'gmtime') {
      if (!gmtimePtr) gmtimePtr = allocator.alloc(36, 4);
      return gmtimePtr;
    }
    if (!localtimePtr) localtimePtr = allocator.alloc(36, 4);
    return localtimePtr;
  }

  function ensureAsctimePtr() {
    if (!asctimeBufPtr) asctimeBufPtr = allocator.alloc(64, 1);
    return asctimeBufPtr;
  }

  function localtimeImpl(timerPtr) {
    const t = readTimeArg(timerPtr);
    const d = new Date(t * 1000);
    const ptr = ensureTmPtr('localtime');
    writeTm(mem, ptr, d, false);
    return ptr;
  }

  return {
    time: (timerPtr) => {
      const t = Math.floor(nowMs() / 1000);
      if (timerPtr) {
        mem.writeI32(timerPtr, t);
      }
      return t;
    },
    clock: () => Math.floor(perfNow() * 1000),
    difftime: (t1, t0) => Number(t1) - Number(t0),
    localtime: (timerPtr) => {
      return localtimeImpl(timerPtr);
    },
    gmtime: (timerPtr) => {
      const t = readTimeArg(timerPtr);
      const d = new Date(t * 1000);
      const ptr = ensureTmPtr('gmtime');
      writeTm(mem, ptr, d, true);
      return ptr;
    },
    mktime: (tmPtr) => {
      if (!tmPtr) return -1;
      const tm = readTm(mem, tmPtr);
      const d = new Date(
        tm.tm_year + 1900,
        tm.tm_mon,
        tm.tm_mday,
        tm.tm_hour,
        tm.tm_min,
        tm.tm_sec,
        0
      );
      return Math.floor(d.getTime() / 1000);
    },
    asctime: (tmPtr) => {
      if (!tmPtr) return 0;
      const tm = readTm(mem, tmPtr);
      const text = formatTmAsctime(tm);
      const ptr = ensureAsctimePtr();
      mem.writeCString(ptr, text, 64);
      return ptr;
    },
    ctime: (timerPtr) => {
      const tmPtr = localtimeImpl(timerPtr);
      if (!tmPtr) return 0;
      const tm = readTm(mem, tmPtr);
      const text = formatTmAsctime(tm);
      const ptr = ensureAsctimePtr();
      mem.writeCString(ptr, text, 64);
      return ptr;
    },
    strftime: (sPtr, max, fmtPtr, tmPtr) => {
      if (!sPtr || !max || !fmtPtr || !tmPtr) return 0;
      const tm = readTm(mem, tmPtr);
      const fmt = mem.readCString(fmtPtr);
      const text = formatStrftime(fmt, tm);
      const written = mem.writeCString(sPtr, text, max | 0);
      return written;
    }
  };
}

function createLocaleHosts(getMemory, allocator, cstr, _opts = {}) {
  const mem = createMemoryAccess(getMemory);
  let currentLocale = 'C';
  let localeconvPtr = 0;

  function ensureLocaleconv() {
    if (localeconvPtr) return localeconvPtr;

    localeconvPtr = allocator.alloc(64, 4);
    if (!localeconvPtr) return 0;

    const decimalPoint = cstr.intern('.');
    const thousandsSep = cstr.intern('');
    const grouping = cstr.intern('');
    const currency = cstr.intern('');
    const empty = cstr.intern('');

    mem.writeI32(localeconvPtr + 0, decimalPoint);
    mem.writeI32(localeconvPtr + 4, thousandsSep);
    mem.writeI32(localeconvPtr + 8, grouping);
    mem.writeI32(localeconvPtr + 12, currency);
    mem.writeI32(localeconvPtr + 16, empty);
    mem.writeI32(localeconvPtr + 20, decimalPoint);
    mem.writeI32(localeconvPtr + 24, thousandsSep);
    mem.writeI32(localeconvPtr + 28, grouping);
    mem.writeI32(localeconvPtr + 32, empty);
    mem.writeI32(localeconvPtr + 36, empty);

    mem.writeI8(localeconvPtr + 40, 2);
    mem.writeI8(localeconvPtr + 41, 2);
    mem.writeI8(localeconvPtr + 42, 1);
    mem.writeI8(localeconvPtr + 43, 0);
    mem.writeI8(localeconvPtr + 44, 1);
    mem.writeI8(localeconvPtr + 45, 0);
    mem.writeI8(localeconvPtr + 46, 1);
    mem.writeI8(localeconvPtr + 47, 1);

    return localeconvPtr;
  }

  return {
    setlocale: (_category, localePtr) => {
      if (localePtr) {
        const requested = mem.readCString(localePtr);
        if (requested) {
          currentLocale = requested;
        }
      }
      return cstr.intern(currentLocale);
    },
    localeconv: () => ensureLocaleconv()
  };
}

function createSignalHosts(_getMemory, _allocator, _cstr, opts = {}) {
  const handlers = new Map();
  const onSignal = typeof opts.onSignal === 'function' ? opts.onSignal : null;

  return {
    signal: (sig, funcPtr) => {
      const key = sig | 0;
      const previous = handlers.has(key) ? handlers.get(key) : 0;
      handlers.set(key, funcPtr | 0);
      return previous;
    },
    raise: (sig) => {
      const key = sig | 0;
      if (onSignal) {
        onSignal(key, handlers.get(key) || 0);
      }
      return 0;
    }
  };
}

function createC89JsHosts(getMemory, opts = {}) {
  const allocator = createRuntimeAllocator(getMemory);
  const mem = createMemoryAccess(getMemory);
  const cstr = createCStringStore(getMemory, allocator, mem);

  return {
    ...createMathHosts(getMemory),
    ...createStdioHosts(getMemory, allocator, cstr, opts),
    ...createTimeHosts(getMemory, allocator, cstr, opts),
    ...createLocaleHosts(getMemory, allocator, cstr, opts),
    ...createSignalHosts(getMemory, allocator, cstr, opts)
  };
}

module.exports = {
  createMathHosts,
  createStdioHosts,
  createTimeHosts,
  createLocaleHosts,
  createSignalHosts,
  createC89JsHosts
};

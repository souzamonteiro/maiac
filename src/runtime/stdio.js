'use strict';

const { sprintf, parseFormatSpec } = require('./sprintf.js');

function readCString(memory, ptr) {
  const mem = new Uint8Array(memory.buffer);
  const offset = ptr >>> 0;
  let end = offset;
  while (end < mem.length && mem[end] !== 0) {
    end += 1;
  }
  return new TextDecoder('utf-8').decode(mem.subarray(offset, end));
}

function extractSpecifiers(fmt) {
  const text = String(fmt || '');
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

    const spec = parseFormatSpec(text, i + 1);
    if (!spec.type) {
      i += 1;
      continue;
    }

    specs.push(spec);
    i = spec.end + 1;
  }

  return specs;
}

function resolvePrintfArgs(memory, fmt, rawArgs) {
  const specs = extractSpecifiers(fmt);
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
      resolved.push(readCString(memory, Math.trunc(raw) >>> 0));
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

function createPrintfHost({ getMemory, write }) {
  return function printf(fmtPtr, a1, a2, a3, a4, a5, a6, a7) {
    const memory = getMemory();
    if (!memory) {
      return 0;
    }

    try {
      const fmt = readCString(memory, fmtPtr >>> 0);
      const args = resolvePrintfArgs(memory, fmt, [a1, a2, a3, a4, a5, a6, a7]);
      const text = sprintf(fmt, args);
      write(text);
      return text.length | 0;
    } catch (_error) {
      write('[printf-host-error]');
      return 0;
    }
  };
}

module.exports = {
  createPrintfHost,
  readCString,
  resolvePrintfArgs,
  extractSpecifiers
};

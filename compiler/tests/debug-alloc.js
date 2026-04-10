'use strict';
const fs = require('fs');
const path = require('path');
const compilerDir = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(compilerDir, 'c-compiler.js'), 'utf8');

// Patch to log every call including size
const oldSig = 'function allocateStackSlot(context, symbol) {';
const patch = oldSig + `
  process.stderr.write("ALLOC name=" + (symbol ? symbol.sourceName : "null") + " usesLinear=" + context.usesLinearMemory + " hasOffset=" + (symbol ? symbol.stackOffset : "N/A") + " isArray=" + (symbol ? symbol.isArray : "N/A") + " ptrDepth=" + (symbol ? (symbol.pointerDepth||0) : "N/A") + " arrDims=" + JSON.stringify(symbol ? symbol.arrayDimensions : null) + " baseWat=" + (symbol ? symbol.baseWatType : "N/A") + " structLayout=" + JSON.stringify(symbol && symbol.structLayout ? {size: symbol.structLayout.size} : null) + "\\n");`;

const patched = src.replace(oldSig, patch);

if (patched === src) {
  console.error('ERROR: Patch not applied');
  process.exit(1);
}

const debugFilePath = path.join(compilerDir, 'c-compiler-debug-tmp.js');
fs.writeFileSync(debugFilePath, patched);

try {
  const { compileSource } = require(debugFilePath);
  const code = 'struct Node { int value; };\nint test_entry() {\n  struct Node nodes[2];\n  struct Node *ptrs[2];\n  return 0;\n}';
  compileSource(code);
} finally {
  fs.unlinkSync(debugFilePath);
}

#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const Parser = require('./c-parser');
const { ParseTreeCollector, printTree } = require('./parse-tree-collector');
const { renderModule } = require('./wat-templates');
const {
  preprocessCSource,
  collectNamedAggregateTags,
  collectTypedefAliases: collectTypedefAliasesFromPreprocessor
} = require('./c-preprocessor');

let WatAssembler = null;
try {
  WatAssembler = require('../maiawasm/assembler/wat-assembler.js');
} catch (_error) {
  WatAssembler = null;
}

const SUPPORTED_BACKENDS = {
  wat: emitWatFromModule
};

class CompilationError extends Error {
  constructor(message, nodeName = null) {
    super(nodeName ? `${message} (${nodeName})` : message);
    this.name = 'CompilationError';
  }
}

function getNodeName(node) {
  return node && node.kind === 'nonterminal' ? String(node.name || '').trim() : null;
}

function isNonterminal(node, name = null) {
  return !!node && node.kind === 'nonterminal' && (!name || getNodeName(node) === name);
}

function isTerminal(node, token = null) {
  return !!node && node.kind === 'terminal' && (!token || node.token === token);
}

function childNodes(node) {
  return Array.isArray(node && node.children) ? node.children : [];
}

function nonterminalChildren(node, name = null) {
  return childNodes(node).filter((child) => isNonterminal(child, name));
}

function terminalChildren(node, token = null) {
  return childNodes(node).filter((child) => isTerminal(child, token));
}

function firstNonterminal(node, name) {
  return nonterminalChildren(node, name)[0] || null;
}

function firstTerminal(node, token = null) {
  return terminalChildren(node, token)[0] || null;
}

function findFirst(node, predicate) {
  if (!node) return null;
  if (predicate(node)) return node;
  for (const child of childNodes(node)) {
    const match = findFirst(child, predicate);
    if (match) return match;
  }
  return null;
}

function findAll(node, predicate, results = []) {
  if (!node) return results;
  if (predicate(node)) results.push(node);
  for (const child of childNodes(node)) {
    findAll(child, predicate, results);
  }
  return results;
}

function findFirstNonterminal(node, name) {
  return findFirst(node, (candidate) => isNonterminal(candidate, name));
}

function findFirstTerminal(node, token) {
  return findFirst(node, (candidate) => isTerminal(candidate, token));
}

function sanitizeIdentifier(name) {
  return String(name || 'unnamed').replace(/[^A-Za-z0-9_.$-]/g, '_');
}

function alignTo(value, alignment) {
  const safeAlignment = Math.max(1, alignment || 1);
  return Math.ceil(value / safeAlignment) * safeAlignment;
}

function countPointerDepthInDeclarator(declaratorNode) {
  return findAll(
    declaratorNode,
    (candidate) => candidate && candidate.kind === 'terminal' && candidate.token === 'TOKEN__2A_'
  ).length;
}

function getTypeSize(watType = 'i32') {
  switch (watType) {
    case 'i64':
    case 'f64':
      return 8;
    case 'i8':
      return 1;
    default:
      return 4;
  }
}

function getDimensionProduct(dimensions = []) {
  const validDimensions = Array.isArray(dimensions)
    ? dimensions.filter((value) => Number.isInteger(value) && value > 0)
    : [];

  return validDimensions.length > 0
    ? validDimensions.reduce((product, value) => product * value, 1)
    : 1;
}

function getSymbolArrayDimensions(symbol) {
  if (!symbol) return [];
  if (Array.isArray(symbol.arrayDimensions) && symbol.arrayDimensions.length > 0) {
    return [...symbol.arrayDimensions];
  }
  if (Number.isInteger(symbol.arrayLength) && symbol.arrayLength > 0) {
    return [symbol.arrayLength];
  }
  return [];
}

function getSymbolSize(symbol) {
  if (!symbol) return 4;
  if (symbol.isArray) {
    // An array of pointers (char *arr[], int *arr[]) stores i32 addresses per element,
    // not elements of the base type (char/int). Use pointer size (4) in that case.
    const elementSize = (symbol.pointerDepth || 0) > 0
      ? 4
      : (symbol.structLayout && (symbol.isStruct || symbol.typeKind === 'struct')
        ? (symbol.structLayout.size || 4)
        : getTypeSize(symbol.baseWatType || symbol.watType || 'i32'));
    return elementSize * getDimensionProduct(getSymbolArrayDimensions(symbol));
  }
  if (symbol.structLayout && (symbol.isStruct || symbol.typeKind === 'struct')) {
    return symbol.structLayout.size || 4;
  }
  if ((symbol.pointerDepth || 0) > 0) return 4;
  return getTypeSize(symbol.baseWatType || symbol.watType || 'i32');
}

function resolveDirectSymbol(name, context) {
  return context.locals.get(name)
    || context.params.get(name)
    || context.module.globalsByName.get(name)
    || null;
}

function extractStructTagNameFromSpecifierNode(structSpecifier) {
  if (!structSpecifier) return null;

  for (const child of childNodes(structSpecifier)) {
    if (isNonterminal(child, 'structDeclarationList')) {
      break;
    }

    if (isTerminal(child, 'Identifier')) {
      return child.value;
    }

    const nestedIdentifier = findFirstTerminal(child, 'Identifier');
    if (nestedIdentifier) {
      return nestedIdentifier.value;
    }
  }

  return null;
}

function createStructLayout(fields = [], preferredName = null) {
  let offset = 0;
  const layout = {
    name: preferredName || null,
    size: 0,
    fields: [],
    fieldsByName: new Map()
  };

  for (const field of fields) {
    const fieldSize = getSymbolSize(field);
    const alignment = fieldSize >= 8 ? 8 : 4;
    offset = alignTo(offset, alignment);

    const layoutField = {
      ...field,
      offset,
      size: fieldSize
    };

    layout.fields.push(layoutField);
    layout.fieldsByName.set(layoutField.sourceName, layoutField);
    offset += fieldSize;
  }

  layout.size = alignTo(offset, 4);
  return layout;
}

function extractStructFieldDefinitions(structDeclarationList, moduleModel = null) {
  if (!structDeclarationList) {
    return [];
  }

  const fields = [];

  for (const structDeclaration of nonterminalChildren(structDeclarationList, 'structDeclaration')) {
    const specifierQualifierList = firstNonterminal(structDeclaration, 'specifierQualifierList');
    const fieldTypeInfo = extractDeclarationTypeInfo(specifierQualifierList, moduleModel);
    const structDeclaratorList = firstNonterminal(structDeclaration, 'structDeclaratorList');

    for (const structDeclarator of nonterminalChildren(structDeclaratorList, 'structDeclarator')) {
      const declaratorNode = firstNonterminal(structDeclarator, 'declarator');
      if (!declaratorNode) {
        continue;
      }

      const declaratorInfo = extractDeclaratorInfo(declaratorNode);
      const arrayDimensions = extractArrayDimensionsFromDeclarator(declaratorNode);
      const pointeeArrayDimensions = extractPointerPointeeArrayDimensionsFromDeclarator(declaratorNode);
      const isArray = arrayDimensions.length > 0;
      const pointerDepth = declaratorInfo.pointerDepth || 0;
      const isStruct = fieldTypeInfo.typeKind === 'struct' && pointerDepth === 0;
      const watType = toWatType((isStruct || pointerDepth > 0 || isArray) ? 'i32' : fieldTypeInfo.baseWatType);

      fields.push({
        sourceName: declaratorInfo.sourceName,
        name: declaratorInfo.name,
        cType: fieldTypeInfo.cType,
        typeKind: fieldTypeInfo.typeKind,
        structName: fieldTypeInfo.structName || null,
        structLayout: fieldTypeInfo.structLayout || null,
        isStruct,
        pointerDepth,
        pointeeArrayDimensions,
        baseWatType: fieldTypeInfo.baseWatType,
        watType,
        isArray,
        arrayLength: isArray ? (arrayDimensions[0] ?? null) : null,
        arrayDimensions
      });
    }
  }

  return fields;
}

function extractDeclarationTypeInfo(specifierNode, moduleModel = null) {
  const structSpecifier = findTypeSpecifierNode(specifierNode, 'structOrUnionSpecifier');

  if (structSpecifier) {
    const structName = extractStructTagNameFromSpecifierNode(structSpecifier);
    const structDeclarationList = firstNonterminal(structSpecifier, 'structDeclarationList');
    const structLayout = structDeclarationList
      ? createStructLayout(extractStructFieldDefinitions(structDeclarationList, moduleModel), structName)
      : (structName && moduleModel ? resolveStructLayout(structName, moduleModel, null) : null);

    return {
      typeKind: 'struct',
      cType: structName ? `struct ${structName}` : 'struct',
      structName,
      structLayout,
      baseWatType: 'i32'
    };
  }

  const cType = extractBuiltinType(specifierNode);
  return {
    typeKind: 'builtin',
    cType,
    structName: null,
    structLayout: null,
    baseWatType: mapCTypeToWat(cType)
  };
}

function registerStructLayout(layout, moduleModel, explicitName = null) {
  if (!layout || !moduleModel) {
    return layout || null;
  }

  if (!moduleModel.structsByName) {
    moduleModel.structsByName = new Map();
  }
  if (!moduleModel.pendingStructLayouts) {
    moduleModel.pendingStructLayouts = [];
  }

  let name = explicitName || layout.name;
  if (!name && Array.isArray(moduleModel.pendingAggregateTags) && moduleModel.pendingAggregateTags.length > 0) {
    name = moduleModel.pendingAggregateTags.shift() || null;
  }

  if (name) {
    layout.name = name;
    moduleModel.structsByName.set(name, layout);
    moduleModel.pendingStructLayouts = moduleModel.pendingStructLayouts.filter((candidate) => candidate !== layout);
  } else if (!moduleModel.pendingStructLayouts.includes(layout)) {
    moduleModel.pendingStructLayouts.push(layout);
  }

  return layout;
}

function finalizeStructLayout(layout, moduleModel, seenLayouts = new Set()) {
  if (!layout || !moduleModel || seenLayouts.has(layout)) {
    return layout || null;
  }

  seenLayouts.add(layout);

  let offset = 0;
  for (const field of layout.fields || []) {
    if (field.isStruct && !field.structLayout && field.structName) {
      field.structLayout = resolveStructLayout(field.structName, moduleModel, null, seenLayouts);
    } else if (field.structLayout) {
      finalizeStructLayout(field.structLayout, moduleModel, seenLayouts);
    }

    const fieldSize = getSymbolSize(field);
    const alignment = fieldSize >= 8 ? 8 : 4;
    offset = alignTo(offset, alignment);
    field.offset = offset;
    field.size = fieldSize;
    offset += fieldSize;
  }

  layout.size = alignTo(offset, 4);
  return layout;
}

function resolveStructLayout(structName, moduleModel, inlineLayout = null, seenLayouts = new Set()) {
  if (!moduleModel) {
    return inlineLayout || null;
  }

  let layout = null;

  if (inlineLayout) {
    layout = registerStructLayout(inlineLayout, moduleModel, structName || inlineLayout.name || null);
  } else if (structName && moduleModel.structsByName && moduleModel.structsByName.has(structName)) {
    layout = moduleModel.structsByName.get(structName);
  } else if (structName && moduleModel.pendingStructLayouts && moduleModel.pendingStructLayouts.length > 0) {
    const matchingPending = moduleModel.pendingStructLayouts.find((candidate) => candidate && candidate.name === structName);
    if (matchingPending) {
      layout = registerStructLayout(matchingPending, moduleModel, structName);
    }
  } else if (!structName && moduleModel.pendingStructLayouts && moduleModel.pendingStructLayouts.length > 0) {
    const unnamedPending = moduleModel.pendingStructLayouts.find((candidate) => candidate && !candidate.name);
    const fallbackLayout = unnamedPending || moduleModel.pendingStructLayouts[0];
    layout = registerStructLayout(fallbackLayout, moduleModel, (fallbackLayout && fallbackLayout.name) || null);
  }

  return layout ? finalizeStructLayout(layout, moduleModel, seenLayouts) : null;
}

function resolveMemberAccess(name, context) {
  const parts = String(name || '').split('.').filter(Boolean);
  if (parts.length < 2) {
    return null;
  }

  const baseName = parts[0];
  const baseSymbol = resolveDirectSymbol(baseName, context);
  if (!baseSymbol) {
    throw new CompilationError(`Unknown base symbol '${baseName}'`, context.function.sourceName);
  }

  if (baseSymbol.stackOffset == null) {
    throw new CompilationError(`Struct member access is currently supported only for frame-backed locals and parameters ('${baseName}')`, context.function.sourceName);
  }

  let index = 1;
  let structLayout = null;
  let addressInstructions = null;

  if (parts[index] === '__arrow__') {
    if ((baseSymbol.pointerDepth || 0) <= 0) {
      throw new CompilationError(`'${baseName}' is not a pointer-to-struct value`, context.function.sourceName);
    }

    structLayout = resolveStructLayout(baseSymbol.structName, context.module, baseSymbol.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct layout for pointer '${baseName}'`, context.function.sourceName);
    }

    addressInstructions = compileExpression(
      { kind: 'terminal', token: 'Identifier', value: baseName },
      context,
      { keepValue: true }
    );
    index += 1;
  } else {
    structLayout = resolveStructLayout(baseSymbol.structName, context.module, baseSymbol.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct layout for '${baseName}'`, context.function.sourceName);
    }
    addressInstructions = emitAddressOfSymbol(baseName, context);
  }

  let field = null;

  while (index < parts.length) {
    const fieldName = parts[index];
    if (fieldName === '__arrow__') {
      throw new CompilationError(`Malformed struct pointer access near '${name}'`, context.function.sourceName);
    }

    field = structLayout.fieldsByName.get(fieldName);
    if (!field) {
      throw new CompilationError(`Unknown struct field '${fieldName}' on '${parts.slice(0, index).join('.')}'`, context.function.sourceName);
    }

    addressInstructions = addressInstructions.concat(`i32.const ${field.offset}`, 'i32.add');
    const nextPart = parts[index + 1] || null;

    if (nextPart === '__arrow__') {
      if ((field.pointerDepth || 0) <= 0) {
        throw new CompilationError(`Field '${fieldName}' is not a pointer and cannot use '->'`, context.function.sourceName);
      }

      structLayout = resolveStructLayout(field.structName, context.module, field.structLayout || null);
      if (!structLayout) {
        throw new CompilationError(`Unknown pointed struct layout for field '${fieldName}'`, context.function.sourceName);
      }

      addressInstructions = addressInstructions.concat(getLoadOpcodeForType(field.watType || 'i32'));
      index += 2;
      continue;
    }

    if (nextPart) {
      if (!field.isStruct) {
        throw new CompilationError(`Field '${fieldName}' is not a nested struct`, context.function.sourceName);
      }

      structLayout = resolveStructLayout(field.structName, context.module, field.structLayout || null);
      if (!structLayout) {
        throw new CompilationError(`Unknown nested struct layout for field '${fieldName}'`, context.function.sourceName);
      }
    } else {
      structLayout = field.isStruct
        ? resolveStructLayout(field.structName, context.module, field.structLayout || null)
        : null;
    }

    index += 1;
  }

  return {
    baseSymbol,
    field,
    addressInstructions,
    watType: field ? (field.watType || field.baseWatType || 'i32') : (baseSymbol.watType || 'i32'),
    isStruct: !!(field && field.isStruct),
    structLayout
  };
}

function parseCIntegerLiteral(text) {
  const value = String(text).trim();
  if (/^0[xX][0-9a-fA-F]+$/.test(value)) return parseInt(value.slice(2), 16);
  if (/^0[bB][01]+$/.test(value)) return parseInt(value.slice(2), 2);
  if (/^0[0-7]+$/.test(value) && value.length > 1) return parseInt(value.slice(1), 8);
  return parseInt(value, 10);
}

function parseCFloatingLiteral(text) {
  const raw = String(text || '').trim();
  const normalized = raw.replace(/[fFlL]+$/, '');
  const numericValue = Number(normalized);

  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  if (/^0[xX][0-9a-fA-F]+$/.test(normalized)) {
    return parseInt(normalized.slice(2), 16);
  }

  return 0;
}

function parseCCharacterLiteral(text) {
  const raw = String(text).trim();
  const body = raw.replace(/^L?'/, '').replace(/'$/, '');

  const escapes = {
    '\\n': 10,
    '\\r': 13,
    '\\t': 9,
    '\\0': 0,
    '\\a': 7,
    '\\b': 8,
    '\\f': 12,
    '\\v': 11,
    "\\'": 39,
    '\\"': 34,
    '\\\\': 92
  };

  if (Object.prototype.hasOwnProperty.call(escapes, body)) {
    return escapes[body];
  }

  if (/^\\x[0-9a-fA-F]+$/.test(body)) {
    return parseInt(body.slice(2), 16);
  }

  if (/^\\[0-7]{1,3}$/.test(body)) {
    return parseInt(body.slice(1), 8);
  }

  return body.codePointAt(0);
}

function parseCStringLiteral(text) {
  const raw = String(text).trim();
  const body = raw.replace(/^L?"/, '').replace(/"$/, '');
  const escapes = {
    'n': 10,
    'r': 13,
    't': 9,
    '0': 0,
    'a': 7,
    'b': 8,
    'f': 12,
    'v': 11,
    "'": 39,
    '"': 34,
    '\\': 92
  };
  const values = [];

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char !== '\\') {
      const codePoint = body.codePointAt(index);
      values.push(codePoint);
      if (codePoint > 0xFFFF) {
        index += 1;
      }
      continue;
    }

    const next = body[index + 1];
    if (next == null) {
      values.push(92);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(escapes, next)) {
      values.push(escapes[next]);
      index += 1;
      continue;
    }

    if (next === 'x' || next === 'X') {
      let hex = '';
      let cursor = index + 2;
      while (cursor < body.length && /[0-9a-fA-F]/.test(body[cursor])) {
        hex += body[cursor];
        cursor += 1;
      }
      if (hex) {
        values.push(parseInt(hex, 16));
        index = cursor - 1;
        continue;
      }
    }

    if (/[0-7]/.test(next)) {
      let octal = next;
      let cursor = index + 2;
      while (cursor < body.length && octal.length < 3 && /[0-7]/.test(body[cursor])) {
        octal += body[cursor];
        cursor += 1;
      }
      values.push(parseInt(octal, 8));
      index = cursor - 1;
      continue;
    }

    values.push(next.codePointAt(0));
    index += 1;
  }

  return values;
}

function encodeI32WordsAsBytes(values) {
  const bytes = [];

  for (const value of values) {
    const normalized = Number(value) >>> 0;
    bytes.push(
      normalized & 0xFF,
      (normalized >>> 8) & 0xFF,
      (normalized >>> 16) & 0xFF,
      (normalized >>> 24) & 0xFF
    );
  }

  return bytes;
}

function findTypeSpecifierNode(specifierNode, targetName, visited = new Set()) {
  if (!specifierNode || visited.has(specifierNode)) {
    return null;
  }

  if (isNonterminal(specifierNode, targetName)) {
    return specifierNode;
  }

  visited.add(specifierNode);

  const allowedContainers = new Set([
    'declarationSpecifiers',
    'declarationSpecifier',
    'specifierQualifierList',
    'specifierQualifier',
    'typeSpecifier',
    'typeSpecifierSequence',
    'namedTypeSpecifier',
    'typeQualifier',
    'storageClassSpecifier'
  ]);

  for (const child of childNodes(specifierNode)) {
    if (isNonterminal(child, targetName)) {
      return child;
    }

    if (child && child.kind === 'nonterminal' && allowedContainers.has(getNodeName(child))) {
      const nested = findTypeSpecifierNode(child, targetName, visited);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function extractBuiltinType(specifierNode) {
  const builtinType = findTypeSpecifierNode(specifierNode, 'builtinTypeSpecifier');
  if (!builtinType) return 'int';

  const keywords = findAll(
    builtinType,
    (candidate) => candidate && candidate.kind === 'terminal' && /^TOKEN_[A-Za-z]/.test(candidate.token)
  ).map((terminal) => terminal.value);

  return keywords.join(' ').trim() || 'int';
}

// Maps a C type name to an internal pseudo WAT type.
// 'i8' is used internally for char: size=1, load8_u/store8. It must be
// converted to 'i32' before appearing in any WAT text (see toWatType).
function mapCTypeToWat(cType) {
  const normalized = String(cType || 'int').replace(/\s+/g, ' ').trim();

  if (normalized.includes('void')) return null;
  if (normalized.includes('double')) return 'f64';
  if (normalized.includes('float')) return 'f32';
  if (normalized.includes('long')) return 'i64';
  if (normalized === 'char' || normalized === 'unsigned char' || normalized === 'signed char') return 'i8';
  return 'i32';
}

// Converts pseudo-types to real WAT value types (WAT has no i8 locals/params).
function toWatType(t) {
  return t === 'i8' ? 'i32' : (t || 'i32');
}

function selectCommonWatType(leftType = 'i32', rightType = 'i32') {
  if (leftType === rightType) return leftType;
  if (leftType === 'f64' || rightType === 'f64') return 'f64';
  if (leftType === 'f32' || rightType === 'f32') return 'f32';
  if (leftType === 'i64' || rightType === 'i64') return 'i64';
  return 'i32';
}

function inferResultTypeFromInstructions(instructions, context = null) {
  if (!Array.isArray(instructions) || instructions.length === 0) {
    return null;
  }

  const lastInstruction = String(instructions[instructions.length - 1] || '');
  if (/^f32\./.test(lastInstruction)) return 'f32';
  if (/^f64\./.test(lastInstruction)) return 'f64';
  if (/^i64\./.test(lastInstruction)) return 'i64';
  if (/^i32\./.test(lastInstruction)) return 'i32';

  const directCallMatch = lastInstruction.match(/^call \$([^\s]+)$/);
  if (directCallMatch && context && context.module && Array.isArray(context.module.functions)) {
    const calleeName = directCallMatch[1];
    const functionModel = context.module.functions.find(
      (candidate) => candidate && (candidate.name === calleeName || sanitizeIdentifier(candidate.sourceName) === calleeName)
    );
    if (functionModel && functionModel.resultType) {
      return functionModel.resultType;
    }
  }

  const localGetMatch = lastInstruction.match(/^local\.get \$([^\s]+)$/);
  if (localGetMatch && context) {
    const localName = localGetMatch[1];
    const symbols = [
      ...Array.from((context.locals || new Map()).values()),
      ...Array.from((context.params || new Map()).values())
    ];
    const symbol = symbols.find(
      (candidate) => candidate && (candidate.name === localName || sanitizeIdentifier(candidate.sourceName) === localName)
    );
    if (symbol && symbol.watType) {
      return toWatType(symbol.watType);
    }
  }

  const globalGetMatch = lastInstruction.match(/^global\.get \$([^\s]+)$/);
  if (globalGetMatch && context && context.module && context.module.globalsByName) {
    const globalName = globalGetMatch[1];
    const symbol = Array.from(context.module.globalsByName.values()).find(
      (candidate) => candidate && (candidate.name === globalName || sanitizeIdentifier(candidate.sourceName) === globalName)
    );
    if (symbol && symbol.watType) {
      return toWatType(symbol.watType);
    }
  }

  return null;
}

function coerceInstructionsToType(instructions, sourceType = 'i32', targetType = 'i32', context = null) {
  const from = inferResultTypeFromInstructions(instructions, context) || sourceType || targetType || 'i32';
  const to = targetType || from || 'i32';

  if (!instructions || from === to || !to) {
    return Array.isArray(instructions) ? [...instructions] : [];
  }

  const result = [...instructions];

  if (to === 'i32') {
    if (from === 'f64') return result.concat('i32.trunc_f64_s');
    if (from === 'f32') return result.concat('i32.trunc_f32_s');
    if (from === 'i64') return result.concat('i32.wrap_i64');
    return result;
  }

  if (to === 'i64') {
    if (from === 'i32') return result.concat('i64.extend_i32_s');
    if (from === 'f32') return result.concat('i64.trunc_f32_s');
    if (from === 'f64') return result.concat('i64.trunc_f64_s');
    return result;
  }

  if (to === 'f32') {
    if (from === 'i32') return result.concat('f32.convert_i32_s');
    if (from === 'i64') return result.concat('f32.convert_i64_s');
    if (from === 'f64') return result.concat('f32.demote_f64');
    return result;
  }

  if (to === 'f64') {
    if (from === 'i32') return result.concat('f64.convert_i32_s');
    if (from === 'i64') return result.concat('f64.convert_i64_s');
    if (from === 'f32') return result.concat('f64.promote_f32');
    return result;
  }

  return result;
}

function extractTypeInfoFromTypeName(typeNameNode) {
  const specifierQualifierList = firstNonterminal(typeNameNode, 'specifierQualifierList') || typeNameNode;
  const typeInfo = extractDeclarationTypeInfo(specifierQualifierList);
  const pointerDepth = countPointerDepthInDeclarator(typeNameNode);
  const isStruct = typeInfo.typeKind === 'struct' && pointerDepth === 0;
  const baseWatType = typeInfo.baseWatType || 'i32';
  const watType = toWatType((pointerDepth > 0 || isStruct) ? 'i32' : baseWatType);

  return {
    ...typeInfo,
    pointerDepth,
    isStruct,
    baseWatType,
    watType
  };
}

function getSizeFromTypeInfo(typeInfo, context = null) {
  if (!typeInfo) {
    return 4;
  }

  if ((typeInfo.pointerDepth || 0) > 0) {
    return 4;
  }

  if (typeInfo.isStruct || typeInfo.typeKind === 'struct') {
    const structLayout = context
      ? resolveStructLayout(typeInfo.structName || null, context.module, typeInfo.structLayout || null)
      : typeInfo.structLayout;
    return (structLayout && structLayout.size) || 4;
  }

  return getTypeSize(typeInfo.baseWatType || typeInfo.watType || 'i32');
}

function getSizeOfTypeNameNode(typeNameNode, context) {
  return getSizeFromTypeInfo(extractTypeInfoFromTypeName(typeNameNode), context);
}

function getSizeOfExpressionNode(node, context) {
  const simpleIdentifier = getSimpleIdentifierName(node) || extractIdentifierFromNode(node);
  if (simpleIdentifier) {
    if (simpleIdentifier === 'NULL') {
      return 4;
    }
    const symbol = resolveSymbol(simpleIdentifier, context);
    if (symbol) {
      return getSymbolSize(symbol);
    }
  }

  return getTypeSize(inferExpressionType(node, context) || 'i32');
}

function evaluateConstantExpression(node, constants = new Map()) {
  if (!node) {
    return 0;
  }

  if (node.kind === 'terminal') {
    if (node.token === 'IntegerConstant') return parseCIntegerLiteral(node.value);
    if (node.token === 'CharacterConstant') return parseCCharacterLiteral(node.value);
    if (node.token === 'Identifier') {
      if (constants.has(node.value)) {
        return constants.get(node.value);
      }
      if (node.value === 'NULL') {
        return 0;
      }
      throw new CompilationError(`Unknown constant '${node.value}'`, 'constantExpression');
    }
    return 0;
  }

  const nodeName = getNodeName(node);
  const nestedChildren = nonterminalChildren(node);
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');

  if (['constant', 'primaryExpression', 'expression', 'assignmentExpression'].includes(nodeName) && nestedChildren.length > 0) {
    return evaluateConstantExpression(nestedChildren[nestedChildren.length - 1], constants);
  }

  if (nodeName === 'conditionalExpression') {
    if (!firstTerminal(node, 'TOKEN__3F_')) {
      return nestedChildren.length > 0 ? evaluateConstantExpression(nestedChildren[0], constants) : 0;
    }

    const conditionNode = firstNonterminal(node, 'logicalOrExpression');
    const trueNode = firstNonterminal(node, 'expression');
    const falseNode = nestedChildren[nestedChildren.length - 1];
    return evaluateConstantExpression(conditionNode, constants)
      ? evaluateConstantExpression(trueNode, constants)
      : evaluateConstantExpression(falseNode, constants);
  }

  if (nodeName === 'unaryExpression') {
    const unaryOperatorNode = firstNonterminal(node, 'unaryOperator');
    const operatorTerminal = unaryOperatorNode ? firstTerminal(unaryOperatorNode) : null;
    const operandNode = nestedChildren.find((child) => child !== unaryOperatorNode);

    if (operatorTerminal) {
      const value = evaluateConstantExpression(operandNode, constants);
      switch (operatorTerminal.token) {
        case 'TOKEN__2B_': return value;
        case 'TOKEN__2D_': return -value;
        case 'TOKEN__7E_': return ~value;
        case 'TOKEN__21_': return value ? 0 : 1;
        default: break;
      }
    }
  }

  const evaluableNodeNames = new Set([
    'multiplicativeExpression',
    'additiveExpression',
    'shiftExpression',
    'relationalExpression',
    'equalityExpression',
    'andExpression',
    'exclusiveOrExpression',
    'inclusiveOrExpression',
    'logicalAndExpression',
    'logicalOrExpression'
  ]);

  if (evaluableNodeNames.has(nodeName) && pieces.length > 0) {
    let value = evaluateConstantExpression(pieces[0], constants);

    for (let index = 1; index < pieces.length; index += 2) {
      const operatorNode = pieces[index];
      const rightNode = pieces[index + 1];
      if (!operatorNode || operatorNode.kind !== 'terminal' || !rightNode) {
        continue;
      }
      const right = evaluateConstantExpression(rightNode, constants);
      switch (operatorNode.value) {
        case '*': value *= right; break;
        case '/': value = right === 0 ? 0 : Math.trunc(value / right); break;
        case '%': value = right === 0 ? 0 : (value % right); break;
        case '+': value += right; break;
        case '-': value -= right; break;
        case '<<': value <<= right; break;
        case '>>': value >>= right; break;
        case '<': value = value < right ? 1 : 0; break;
        case '<=': value = value <= right ? 1 : 0; break;
        case '>': value = value > right ? 1 : 0; break;
        case '>=': value = value >= right ? 1 : 0; break;
        case '==': value = value === right ? 1 : 0; break;
        case '!=': value = value !== right ? 1 : 0; break;
        case '&': value &= right; break;
        case '^': value ^= right; break;
        case '|': value |= right; break;
        case '&&': value = (value && right) ? 1 : 0; break;
        case '||': value = (value || right) ? 1 : 0; break;
        default: break;
      }
    }

    return value;
  }

  return nestedChildren.length > 0 ? evaluateConstantExpression(nestedChildren[0], constants) : 0;
}

function registerEnumConstantsFromDeclaration(declarationNode, moduleModel) {
  const enumSpecifier = findFirstNonterminal(declarationNode, 'enumSpecifier');
  if (!enumSpecifier || !moduleModel) {
    return;
  }

  if (!moduleModel.enumValues) {
    moduleModel.enumValues = new Map();
  }

  let nextValue = 0;
  for (const enumerator of findAll(enumSpecifier, (candidate) => isNonterminal(candidate, 'enumerator'))) {
    const identifier = firstTerminal(enumerator, 'Identifier');
    if (!identifier) {
      continue;
    }

    const constantExpression = firstNonterminal(enumerator, 'constantExpression');
    const explicitInteger = constantExpression ? findFirstTerminal(constantExpression, 'IntegerConstant') : null;
    const explicitCharacter = constantExpression ? findFirstTerminal(constantExpression, 'CharacterConstant') : null;
    const value = constantExpression
      ? (explicitInteger
        ? parseCIntegerLiteral(explicitInteger.value)
        : (explicitCharacter
          ? parseCCharacterLiteral(explicitCharacter.value)
          : evaluateConstantExpression(constantExpression, moduleModel.enumValues)))
      : nextValue;
    nextValue = value + 1;
    moduleModel.enumValues.set(identifier.value, value);

    if (!moduleModel.globalsByName.has(identifier.value)) {
      const enumDef = {
        sourceName: identifier.value,
        name: sanitizeIdentifier(identifier.value),
        exportName: identifier.value,
        cType: 'enum',
        typeKind: 'enum',
        watType: 'i32',
        baseWatType: 'i32',
        pointerDepth: 0,
        mutable: false,
        exported: false,
        initExpression: `(i32.const ${value})`
      };
      moduleModel.globals.push(enumDef);
      moduleModel.globalsByName.set(enumDef.sourceName, enumDef);
    }
  }
}
function extractParameters(parameterListNode) {
  if (!parameterListNode) return [];

  return nonterminalChildren(parameterListNode, 'parameterDeclaration')
    .map((parameterNode, index) => {
      const declarationSpecifiers = firstNonterminal(parameterNode, 'declarationSpecifiers');
      const declaratorNode = firstNonterminal(parameterNode, 'declarator');
      const typeInfo = extractDeclarationTypeInfo(declarationSpecifiers);
      const rawPointerDepth = declaratorNode ? countPointerDepthInDeclarator(declaratorNode) : 0;
      const declaredAsArray = declaratorNode ? hasArrayDeclaratorSuffix(declaratorNode) : false;
      const arrayDimensions = declaratorNode ? extractArrayDimensionsFromDeclarator(declaratorNode) : [];
      const pointeeArrayDimensions = declaratorNode ? extractPointerPointeeArrayDimensionsFromDeclarator(declaratorNode) : [];
      const pointerDepth = declaredAsArray ? Math.max(1, rawPointerDepth) : rawPointerDepth;
      const isStruct = typeInfo.typeKind === 'struct' && pointerDepth === 0;
      const baseWatType = typeInfo.baseWatType || 'i32';
      const watType = toWatType((pointerDepth > 0 || isStruct) ? 'i32' : baseWatType);
      const nameTerminal = declaratorNode ? findFirstTerminal(declaratorNode, 'Identifier') : null;
      const originalName = nameTerminal ? nameTerminal.value : `arg${index}`;

      if (!nameTerminal && typeInfo.baseWatType == null && pointerDepth === 0) {
        return null;
      }

      return {
        sourceName: originalName,
        name: sanitizeIdentifier(originalName),
        cType: typeInfo.cType,
        typeKind: typeInfo.typeKind,
        structName: typeInfo.structName || null,
        structLayout: typeInfo.structLayout || null,
        isStruct,
        pointerDepth,
        pointeeArrayDimensions,
        declaredAsArray,
        arrayLength: declaredAsArray ? (arrayDimensions[0] ?? null) : null,
        arrayDimensions: declaredAsArray ? arrayDimensions : [],
        baseWatType,
        watType
      };
    })
    .filter(Boolean);
}

function extractDeclaratorInfo(declaratorNode) {
  const directDeclarator = firstNonterminal(declaratorNode, 'directDeclarator')
    || findFirstNonterminal(declaratorNode, 'directDeclarator');

  if (!directDeclarator) {
    throw new CompilationError('Expected a direct declarator', getNodeName(declaratorNode));
  }

  const identifier = findFirstTerminal(directDeclarator, 'Identifier');
  if (!identifier) {
    throw new CompilationError('Could not find an identifier inside the declarator', getNodeName(directDeclarator));
  }

  const parameterList = findFirstNonterminal(directDeclarator, 'parameterList');
  const parameterTypeList = findFirstNonterminal(directDeclarator, 'parameterTypeList');
  const isVariadic = !!(parameterTypeList && findFirstTerminal(parameterTypeList, 'TOKEN__2E__2E__2E_'));

  return {
    sourceName: identifier.value,
    name: sanitizeIdentifier(identifier.value),
    pointerDepth: countPointerDepthInDeclarator(declaratorNode),
    params: extractParameters(parameterList),
    isVariadic
  };
}

function createVariadicBaseParam() {
  return {
    sourceName: '__maiac_va_base',
    name: sanitizeIdentifier('__maiac_va_base'),
    cType: 'void *',
    typeKind: 'builtin',
    structName: null,
    structLayout: null,
    isStruct: false,
    pointerDepth: 1,
    pointeeArrayDimensions: [],
    declaredAsArray: false,
    arrayLength: null,
    arrayDimensions: [],
    baseWatType: 'i32',
    watType: 'i32'
  };
}

function getIdentifierScopedDirectDeclarator(declaratorNode) {
  const identifier = findFirstTerminal(declaratorNode, 'Identifier');
  if (!identifier) {
    return null;
  }

  const directDeclarators = findAll(declaratorNode, (candidate) => isNonterminal(candidate, 'directDeclarator'));
  const matches = directDeclarators.filter((directDeclarator) => {
    const base = firstNonterminal(directDeclarator, 'directDeclaratorBase');
    const directIdentifier = base ? terminalChildren(base, 'Identifier')[0] : null;
    return !!directIdentifier && directIdentifier.value === identifier.value;
  });

  if (matches.length === 0) {
    return null;
  }

  // Prefer the deepest identifier-scoped directDeclarator (typically the final match).
  return matches[matches.length - 1];
}

function getIdentifierScopedDeclaratorSuffixes(declaratorNode) {
  const scopedDirectDeclarator = getIdentifierScopedDirectDeclarator(declaratorNode);
  if (!scopedDirectDeclarator) {
    return [];
  }

  return nonterminalChildren(scopedDirectDeclarator, 'directDeclaratorSuffix');
}

function hasArrayDeclaratorSuffix(declaratorNode) {
  return getIdentifierScopedDeclaratorSuffixes(declaratorNode)
    .some((suffix) => !!firstTerminal(suffix, 'TOKEN__5B_'));
}

function hasFunctionDeclaratorSuffix(declaratorNode) {
  return getIdentifierScopedDeclaratorSuffixes(declaratorNode)
    .some((suffix) => !!firstTerminal(suffix, 'TOKEN__28_'));
}

function extractArrayDimensionsFromDeclarator(declaratorNode) {
  const suffixes = getIdentifierScopedDeclaratorSuffixes(declaratorNode);
  const dimensions = [];

  for (const suffix of suffixes) {
    if (!firstTerminal(suffix, 'TOKEN__5B_')) {
      continue;
    }

    const lengthNode = findFirstTerminal(suffix, 'IntegerConstant');
    dimensions.push(lengthNode ? parseCIntegerLiteral(lengthNode.value) : null);
  }

  return dimensions;
}

function extractPointerPointeeArrayDimensionsFromDeclarator(declaratorNode) {
  if (!declaratorNode) {
    return [];
  }

  const allArraySuffixes = findAll(
    declaratorNode,
    (candidate) => isNonterminal(candidate, 'directDeclaratorSuffix') && !!firstTerminal(candidate, 'TOKEN__5B_')
  );
  const allDimensions = allArraySuffixes.map((suffix) => {
    const lengthNode = findFirstTerminal(suffix, 'IntegerConstant');
    return lengthNode ? parseCIntegerLiteral(lengthNode.value) : null;
  });

  const identifierScopedDimensions = extractArrayDimensionsFromDeclarator(declaratorNode);
  const pointeeCount = Math.max(0, allDimensions.length - identifierScopedDimensions.length);
  return allDimensions.slice(0, pointeeCount);
}

function extractArrayLengthFromDeclarator(declaratorNode) {
  const dimensions = extractArrayDimensionsFromDeclarator(declaratorNode)
    .filter((value) => Number.isInteger(value) && value > 0);
  return dimensions.length > 0 ? dimensions[0] : null;
}

function inferArrayLengthFromInitializer(initializerNode) {
  if (!initializerNode) {
    return null;
  }

  const stringValues = getStringLiteralInitializerValues(initializerNode);
  if (stringValues) {
    return stringValues.length + 1;
  }

  const initializerList = firstNonterminal(initializerNode, 'initializerList');
  if (!initializerList) {
    return null;
  }

  const elements = nonterminalChildren(initializerList, 'initializer');
  return elements.length > 0 ? elements.length : null;
}

function extractDeclarationItems(declarationNode, moduleModel = null) {
  const declarationSpecifiers = firstNonterminal(declarationNode, 'declarationSpecifiers');
  const typeInfo = extractDeclarationTypeInfo(declarationSpecifiers, moduleModel);
  const baseWatType = typeInfo.baseWatType || 'i32';
  const initDeclaratorList = firstNonterminal(declarationNode, 'initDeclaratorList');

  if (!initDeclaratorList) {
    return [];
  }

  return nonterminalChildren(initDeclaratorList, 'initDeclarator').map((initDeclaratorNode, index) => {
    const declaratorNode = firstNonterminal(initDeclaratorNode, 'declarator');
    const declaratorInfo = extractDeclaratorInfo(declaratorNode);
    const initializerNode = firstNonterminal(initDeclaratorNode, 'initializer');
    const isFunctionDeclaration = hasFunctionDeclaratorSuffix(declaratorNode);
    const arrayDimensions = extractArrayDimensionsFromDeclarator(declaratorNode);
    const pointeeArrayDimensions = extractPointerPointeeArrayDimensionsFromDeclarator(declaratorNode);
    const normalizedArrayDimensions = [...arrayDimensions];

    if (
      normalizedArrayDimensions.length > 0
      && !(Number.isInteger(normalizedArrayDimensions[0]) && normalizedArrayDimensions[0] > 0)
    ) {
      const inferredLength = inferArrayLengthFromInitializer(initializerNode);
      if (Number.isInteger(inferredLength) && inferredLength > 0) {
        normalizedArrayDimensions[0] = inferredLength;
      }
    }

    const isArray = normalizedArrayDimensions.length > 0;
    const isStruct = typeInfo.typeKind === 'struct' && declaratorInfo.pointerDepth === 0;
    const watType = toWatType((declaratorInfo.pointerDepth > 0 || isArray || isStruct) ? 'i32' : baseWatType);

    return {
      sourceName: declaratorInfo.sourceName || `value${index}`,
      name: declaratorInfo.name || `value${index}`,
      cType: typeInfo.cType,
      typeKind: typeInfo.typeKind,
      structName: typeInfo.structName || null,
      structLayout: typeInfo.structLayout || null,
      isStruct,
      pointerDepth: declaratorInfo.pointerDepth || 0,
      pointeeArrayDimensions,
      baseWatType,
      watType,
      isArray,
      isFunctionDeclaration,
      params: declaratorInfo.params || [],
      isVariadic: !!declaratorInfo.isVariadic,
      arrayLength: isArray ? (normalizedArrayDimensions[0] ?? null) : null,
      arrayDimensions: normalizedArrayDimensions,
      initializer: initializerNode
    };
  });
}

function normalizeSourceForCurrentParser(source, options = {}) {
  return preprocessCSource(source, options);
}

function parseCSource(source, options = {}) {
  const normalizedSource = normalizeSourceForCurrentParser(source, {
    sourcePath: options.sourcePath || null,
    includeDirs: options.includeDirs || [],
    resolveSystemIncludes: options.resolveSystemIncludes === true
  });
  const collector = new ParseTreeCollector();
  const parser = new Parser(normalizedSource, collector);

  parser.parse();

  if (!collector.root) {
    throw new Error('No AST was generated from the parsed input');
  }

  return {
    ast: collector.root,
    json: collector.toJSON(),
    xml: collector.toXml(),
    collector,
    normalizedSource
  };
}

function declarationHasTypedefSpecifier(specifierNode) {
  return !!findFirst(specifierNode, (candidate) => isTerminal(candidate, 'TOKEN_typedef'));
}

function functionRequiresLinearMemory(functionNode) {
  return !!findFirst(functionNode, (candidate) => {
    if (isNonterminal(candidate, 'pointer')) {
      return true;
    }

    if (isNonterminal(candidate, 'structOrUnionSpecifier')) {
      return true;
    }

    if (isTerminal(candidate, 'Identifier') && /\./.test(String(candidate.value || ''))) {
      return true;
    }

    if (isNonterminal(candidate, 'directDeclaratorSuffix') && firstTerminal(candidate, 'TOKEN__5B_')) {
      return true;
    }

    if (isNonterminal(candidate, 'postfixSuffix') && firstTerminal(candidate, 'TOKEN__5B_')) {
      return true;
    }

    if (isNonterminal(candidate, 'unaryOperator')) {
      const operator = firstTerminal(candidate);
      return !!operator && ['TOKEN__26_', 'TOKEN__2A_'].includes(operator.token);
    }

    return false;
  });
}

function buildGlobalInitializerExpression(initializerNode, globalDef) {
  if (!initializerNode) {
    return `(${globalDef.watType}.const 0)`;
  }

  const integerConstant = findFirstTerminal(initializerNode, 'IntegerConstant');
  if (integerConstant) {
    const value = parseCIntegerLiteral(integerConstant.value);
    const opcode = globalDef.watType === 'i64' ? 'i64.const' : 'i32.const';
    return `(${opcode} ${value})`;
  }

  const charConstant = findFirstTerminal(initializerNode, 'CharacterConstant');
  if (charConstant) {
    return `(i32.const ${parseCCharacterLiteral(charConstant.value)})`;
  }

  const floatingConstant = findFirstTerminal(initializerNode, 'FloatingConstant');
  if (floatingConstant) {
    const numericValue = parseCFloatingLiteral(floatingConstant.value);
    if (globalDef.watType === 'f32') {
      return `(f32.const ${numericValue})`;
    }
    if (globalDef.watType === 'f64') {
      return `(f64.const ${numericValue})`;
    }
    if (globalDef.watType === 'i64') {
      return `(i64.const ${Math.trunc(numericValue)})`;
    }
    return `(i32.const ${Math.trunc(numericValue)})`;
  }

  throw new CompilationError(
    `Only literal global initializers are supported right now for '${globalDef.sourceName}'`,
    getNodeName(initializerNode)
  );
}

function buildModuleModel(ast, options = {}) {
  const translationItems = nonterminalChildren(ast, 'translationUnitItem');
  const moduleModel = {
    types: [],
    imports: [],
    globals: [],
    functions: [],
    tables: [],
    elements: [],
    exports: [],
    memories: [],
    dataSegments: [],
    usesLinearMemory: false,
    globalsByName: new Map(),
    functionsByName: new Map(),
    structsByName: new Map(),
    pendingStructLayouts: [],
    pendingAggregateTags: Array.isArray(options.aggregateTags) ? [...options.aggregateTags] : [],
    enumValues: new Map(),
    stringLiterals: new Map(),
    nextDataOffset: 16
  };

  moduleModel.functionTypes = new Map();

  const functionBodies = [];

  for (const item of translationItems) {
    const externalDeclaration = firstNonterminal(item, 'externalDeclaration');
    if (!externalDeclaration) continue;

    const functionDefinition = firstNonterminal(externalDeclaration, 'functionDefinition');
    if (functionDefinition) {
      const declarationSpecifiers = firstNonterminal(functionDefinition, 'declarationSpecifiers');
      const declaratorNode = firstNonterminal(functionDefinition, 'declarator');
      const declaratorInfo = extractDeclaratorInfo(declaratorNode);
      const returnTypeInfo = extractDeclarationTypeInfo(declarationSpecifiers, moduleModel);
      const returnPointerDepth = declaratorInfo.pointerDepth || 0;
      const returnIsStruct = returnTypeInfo.typeKind === 'struct' && returnPointerDepth === 0;
      const baseResultType = returnTypeInfo.baseWatType || 'i32';
      const resultType = baseResultType === null
        ? null
        : toWatType((returnPointerDepth > 0 || returnIsStruct) ? 'i32' : baseResultType);

      const functionModel = {
        userParams: declaratorInfo.params,
        sourceName: declaratorInfo.sourceName,
        name: declaratorInfo.name,
        exportName: declaratorInfo.sourceName,
        cType: returnTypeInfo.cType,
        resultType,
        params: declaratorInfo.isVariadic
          ? [...declaratorInfo.params, createVariadicBaseParam()]
          : declaratorInfo.params,
        isVariadic: !!declaratorInfo.isVariadic,
        locals: [],
        instructions: []
      };

      moduleModel.functions.push(functionModel);
      moduleModel.functionsByName.set(functionModel.sourceName, functionModel);
      functionBodies.push({ node: functionDefinition, model: functionModel });
      continue;
    }

    const declaration = firstNonterminal(externalDeclaration, 'declaration');
    if (declaration) {
      registerEnumConstantsFromDeclaration(declaration, moduleModel);

      const declarationSpecifiers = firstNonterminal(declaration, 'declarationSpecifiers');
      const isTypedefDeclaration = declarationHasTypedefSpecifier(declarationSpecifiers);
      const typeInfo = extractDeclarationTypeInfo(declarationSpecifiers, moduleModel);
      if (typeInfo.typeKind === 'struct') {
        registerStructLayout(typeInfo.structLayout, moduleModel, typeInfo.structName || null);
      }

      if (isTypedefDeclaration) {
        continue;
      }

      for (const itemDef of extractDeclarationItems(declaration, moduleModel)) {
        if (itemDef.isFunctionDeclaration) {
          // Functions whose names begin with '__' are host-provided imports.
          // Register them so call sites can emit the correct WAT call.
          if (parseHostExternName(itemDef.sourceName)) {
            registerHostExternImport(itemDef, moduleModel);
          }
          continue;
        }

        const globalDef = {
          sourceName: itemDef.sourceName,
          name: itemDef.name,
          exportName: itemDef.sourceName,
          cType: itemDef.cType,
          typeKind: itemDef.typeKind,
          structName: itemDef.structName || null,
          structLayout: itemDef.structLayout || null,
          isStruct: !!itemDef.isStruct,
          watType: itemDef.watType,
          baseWatType: itemDef.baseWatType,
          pointerDepth: itemDef.pointerDepth || 0,
          mutable: true,
          exported: true,
          initExpression: buildGlobalInitializerExpression(itemDef.initializer, itemDef)
        };
        moduleModel.globals.push(globalDef);
        moduleModel.globalsByName.set(globalDef.sourceName, globalDef);
      }
    }
  }

  // Keep a deterministic function table so C function pointers can lower to call_indirect.
  moduleModel.functionTable = moduleModel.functions.map((fn, index) => ({ ...fn, tableIndex: index }));
  moduleModel.functionTableByName = new Map(moduleModel.functionTable.map((fn) => [fn.sourceName, fn]));

  for (const body of functionBodies) {
    compileFunctionBody(body.node, body.model, moduleModel);
  }

  if (moduleModel.functionTable.length > 0) {
    moduleModel.tables = [{ name: 'fn_table', min: moduleModel.functionTable.length }];
    moduleModel.elements = [{ tableName: 'fn_table', offset: 0, functionNames: moduleModel.functionTable.map((fn) => fn.name) }];
  }

  if (moduleModel.usesLinearMemory) {
    moduleModel.memories = [{ name: 'mem', pages: 1 }];

    if (!moduleModel.globalsByName.has('__stack_ptr')) {
      const stackPointerGlobal = {
        sourceName: '__stack_ptr',
        name: '__stack_ptr',
        exportName: '__stack_ptr',
        watType: 'i32',
        baseWatType: 'i32',
        pointerDepth: 0,
        mutable: true,
        exported: true,
        // Place the stack above all string-literal data. With 1-byte-per-char
        // storage the data region can easily exceed the old hard-coded 1024 byte
        // limit, causing the stack to overwrite string constants.
        initExpression: `(i32.const ${alignTo(Math.max(1024, moduleModel.nextDataOffset), 16)})`
      };
      moduleModel.globals.unshift(stackPointerGlobal);
      moduleModel.globalsByName.set(stackPointerGlobal.sourceName, stackPointerGlobal);
    }

    if (!moduleModel.globalsByName.has('__frame_ptr')) {
      const framePointerGlobal = {
        sourceName: '__frame_ptr',
        name: '__frame_ptr',
        exportName: '__frame_ptr',
        cType: 'int',
        watType: 'i32',
        baseWatType: 'i32',
        pointerDepth: 0,
        mutable: true,
        exported: true,
        initExpression: '(i32.const 0)'
      };
      moduleModel.globals.unshift(framePointerGlobal);
      moduleModel.globalsByName.set(framePointerGlobal.sourceName, framePointerGlobal);
    }
  }

  moduleModel.exports = [
    ...moduleModel.functions
      .filter((fn) => fn.exported !== false)
      .map((fn) => ({
        kind: 'func',
        internalName: fn.name,
        exportName: fn.exportName
      })),
    ...(moduleModel.usesLinearMemory
      ? [{ kind: 'memory', internalName: 'mem', exportName: 'memory' }]
      : []),
    ...moduleModel.globals
      .filter((globalDef) => globalDef.exported !== false)
      .map((globalDef) => ({
        kind: 'global',
        internalName: globalDef.name,
        exportName: globalDef.exportName
      }))
  ];

  return moduleModel;
}

function ensureImportedFunction(moduleModel, options = {}) {
  if (!moduleModel) {
    return null;
  }

  if (!moduleModel.importsBySourceName) {
    moduleModel.importsBySourceName = new Map();
  }

  const sourceName = options.sourceName;
  if (!sourceName) {
    return null;
  }

  if (moduleModel.importsBySourceName.has(sourceName)) {
    return moduleModel.importsBySourceName.get(sourceName);
  }

  const importDef = {
    sourceName,
    internalName: options.internalName || `imp_${sanitizeIdentifier(sourceName)}`,
    module: options.module || 'env',
    field: options.field || sourceName,
    paramTypes: Array.isArray(options.paramTypes) ? [...options.paramTypes] : [],
    resultType: options.resultType || null
  };

  moduleModel.imports.push(importDef);
  moduleModel.importsBySourceName.set(sourceName, importDef);
  return importDef;
}

/**
 * Parses a host-extern function name that follows the __object__method convention.
 *
 * Examples:
 *   '__console__log'  → { envKey: '__console__log', jsExpr: 'console.log', parts: ['console', 'log'] }
 *   '__alert'         → { envKey: '__alert',         jsExpr: 'alert',       parts: ['alert'] }
 *   '__Math__floor'   → { envKey: '__Math__floor',   jsExpr: 'Math.floor',  parts: ['Math', 'floor'] }
 *
 * Returns null for names that do not start with '__'.
 */
function parseHostExternName(name) {
  if (!name || !String(name).startsWith('__')) return null;
  const body = String(name).slice(2); // strip leading __
  const parts = body.split('__').filter(Boolean);
  if (parts.length === 0) return null;
  return { envKey: name, jsExpr: parts.join('.'), parts };
}

/**
 * Registers a function whose name starts with '__' as a WAT import from the
 * 'env' module and adds a lightweight stub into moduleModel.functionsByName so
 * call sites can resolve it.
 *
 * The importDef is annotated with:
 *   - .hostInfo   – result of parseHostExternName (object/method breakdown)
 *   - .paramDefs  – the raw parameter descriptors (cType, pointerDepth, …)
 *
 * These annotations are consumed by the JS-wrapper generator to produce the
 * correct host-side function (string dereferencing, method binding, etc.).
 */
function registerHostExternImport(itemDef, moduleModel) {
  const hostInfo = parseHostExternName(itemDef.sourceName);
  if (!hostInfo || !moduleModel) return null;

  const hostSignatureOverrides = {
    __malloc: { paramTypes: ['i32'], resultType: 'i32' },
    __free: { paramTypes: ['i32'], resultType: null }
  };
  const override = hostSignatureOverrides[itemDef.sourceName] || null;

  const paramDefs = Array.isArray(itemDef.params) ? itemDef.params : [];
  const paramTypes = override
    ? override.paramTypes
    : paramDefs.map((p) => toWatType(p.watType || 'i32'));

  // void return → resultType null; otherwise use the declared WAT type.
  const resultType = override
    ? override.resultType
    : ((itemDef.watType === null || itemDef.cType === 'void')
      ? null
      : toWatType(itemDef.watType || 'i32'));

  const importDef = ensureImportedFunction(moduleModel, {
    sourceName: itemDef.sourceName,
    internalName: `imp_${sanitizeIdentifier(itemDef.sourceName)}`,
    module: 'env',
    field: itemDef.sourceName,
    paramTypes,
    resultType
  });

  // Annotate the import with metadata for JS-wrapper generation.
  importDef.hostInfo = hostInfo;
  importDef.paramDefs = paramDefs;

  // Register a stub in functionsByName so call sites know this is a host import.
  if (!moduleModel.functionsByName.has(itemDef.sourceName)) {
    moduleModel.functionsByName.set(itemDef.sourceName, {
      sourceName: itemDef.sourceName,
      name: sanitizeIdentifier(itemDef.sourceName),
      isHostImport: true,
      importDef,
      resultType,
      params: paramDefs
    });
  }

  return importDef;
}

function ensureFunctionType(moduleModel, paramTypes = [], resultType = null) {
  if (!moduleModel) {
    return 0;
  }

  if (!moduleModel.functionTypes) {
    moduleModel.functionTypes = new Map();
  }
  if (!Array.isArray(moduleModel.types)) {
    moduleModel.types = [];
  }

  const key = `${paramTypes.join(',')}->${resultType || 'void'}`;
  if (moduleModel.functionTypes.has(key)) {
    return moduleModel.functionTypes.get(key);
  }

  const typeIndex = moduleModel.types.length;
  moduleModel.types.push({ paramTypes: [...paramTypes], resultType: resultType || null });
  moduleModel.functionTypes.set(key, typeIndex);
  return typeIndex;
}

/**
 * Recursively collect all goto labels from a statement node.
 * This enables pre-registering all labels so goto can reference forward or backward.
 */
function collectGotoLabelsFromStatement(statementNode, labels = new Set()) {
  if (!statementNode) return labels;

  const directStatement = unwrapStatementNode(statementNode);
  if (!directStatement) return labels;

  // Check if this is a labeled statement
  if (isNonterminal(directStatement, 'labeledStatement')) {
    // Skip case/default labels (these are switch-specific)
    if (!firstTerminal(directStatement, 'TOKEN_case') && !firstTerminal(directStatement, 'TOKEN_default')) {
      const labelId = firstTerminal(directStatement, 'Identifier');
      if (labelId) {
        labels.add(sanitizeIdentifier(labelId.value));
      }
    }
    // Continue scanning the statement within the label
    const innerStatement = firstNonterminal(directStatement, 'statement');
    if (innerStatement) {
      collectGotoLabelsFromStatement(innerStatement, labels);
    }
  }

  // Recursively scan nested statements
  if (isNonterminal(directStatement, 'compoundStatement')) {
    const blockItems = nonterminalChildren(directStatement, 'blockItem');
    for (const blockItem of blockItems) {
      const stmt = firstNonterminal(blockItem, 'statement');
      if (stmt) {
        collectGotoLabelsFromStatement(stmt, labels);
      }
    }
  }

  if (isNonterminal(directStatement, 'selectionStatement')) {
    const statements = nonterminalChildren(directStatement, 'statement');
    for (const stmt of statements) {
      collectGotoLabelsFromStatement(stmt, labels);
    }
  }

  if (isNonterminal(directStatement, 'iterationStatement')) {
    const stmt = firstNonterminal(directStatement, 'statement');
    if (stmt) {
      collectGotoLabelsFromStatement(stmt, labels);
    }
  }

  return labels;
}

function compileFunctionBody(functionNode, functionModel, moduleModel) {
  const context = {
    module: moduleModel,
    function: functionModel,
    params: new Map(),
    locals: new Map(),
    internalLocals: new Map(),
    scopeStack: [],
    usedLocalNames: new Set((functionModel.params || []).map((param) => param.name)),
    loopStack: [],
    breakStack: [],
    gotoLabelStack: [],
    nextLabelId: 0,
    usesLinearMemory: functionRequiresLinearMemory(functionNode),
    frameSize: 0
  };

  for (const param of functionModel.params) {
    context.params.set(param.sourceName, param);
    if (context.usesLinearMemory) {
      allocateStackSlot(context, param);
    }
  }

  if (context.usesLinearMemory) {
    ensureInternalLocal(context, '__frame', 'i32');
  }

  const compoundStatement = firstNonterminal(functionNode, 'compoundStatement');
  if (!compoundStatement) {
    throw new CompilationError('Expected a compound statement inside the function body', functionModel.sourceName);
  }

  // Pre-collect all labels in the function to allow unrestricted goto (forward or backward)
  const allLabels = collectGotoLabelsFromStatement(compoundStatement);
  context.gotoLabelStack = Array.from(allLabels);

  const bodyInstructions = compileCompoundStatement(compoundStatement, context);
  functionModel.instructions = [
    ...buildFunctionPrologue(context),
    ...bodyInstructions
  ];

  if (functionModel.resultType) {
    if (functionModel.resultType === 'i32') {
      functionModel.instructions.push('i32.const 0');
    } else if (functionModel.resultType === 'i64') {
      functionModel.instructions.push('i64.const 0');
    } else if (functionModel.resultType === 'f32') {
      functionModel.instructions.push('f32.const 0');
    } else if (functionModel.resultType === 'f64') {
      functionModel.instructions.push('f64.const 0');
    }
    functionModel.instructions.push(...buildFunctionEpilogue(context), 'return');
  }

  moduleModel.usesLinearMemory = moduleModel.usesLinearMemory || context.usesLinearMemory;
}

function pushScope(context) {
  if (!context.scopeStack) {
    context.scopeStack = [];
  }
  context.scopeStack.push([]);
}

function popScope(context) {
  if (!context.scopeStack || context.scopeStack.length === 0) {
    return;
  }

  const bindings = context.scopeStack.pop();
  for (let index = bindings.length - 1; index >= 0; index -= 1) {
    const binding = bindings[index];
    if (binding.previousSymbol) {
      context.locals.set(binding.name, binding.previousSymbol);
    } else {
      context.locals.delete(binding.name);
    }
  }
}

function allocateUniqueLocalName(context, preferredName) {
  const baseName = sanitizeIdentifier(preferredName || 'local');
  if (!context.usedLocalNames) {
    context.usedLocalNames = new Set();
  }

  let candidate = baseName;
  let suffix = 1;
  while (context.usedLocalNames.has(candidate)) {
    candidate = `${baseName}_${suffix}`;
    suffix += 1;
  }

  context.usedLocalNames.add(candidate);
  return candidate;
}

function registerScopedLocal(context, localEntry, nodeName = null) {
  if (!context.scopeStack || context.scopeStack.length === 0) {
    pushScope(context);
  }

  const currentScope = context.scopeStack[context.scopeStack.length - 1];
  if (currentScope.some((binding) => binding.name === localEntry.sourceName) || context.params.has(localEntry.sourceName)) {
    throw new CompilationError(`Duplicate local symbol '${localEntry.sourceName}'`, nodeName || localEntry.sourceName);
  }

  const previousSymbol = context.locals.get(localEntry.sourceName) || null;
  currentScope.push({ name: localEntry.sourceName, previousSymbol });
  context.locals.set(localEntry.sourceName, localEntry);
}

function compileCompoundStatement(compoundNode, context) {
  const instructions = [];
  const blockItems = nonterminalChildren(compoundNode, 'blockItem');

  const getUserLabelFromBlockItem = (blockItem) => {
    const statementNode = firstNonterminal(blockItem, 'statement');
    const directStatement = unwrapStatementNode(statementNode);
    if (!isNonterminal(directStatement, 'labeledStatement')) {
      return null;
    }

    if (firstTerminal(directStatement, 'TOKEN_case') || firstTerminal(directStatement, 'TOKEN_default')) {
      return null;
    }

    const labelIdentifier = firstTerminal(directStatement, 'Identifier');
    return labelIdentifier ? labelIdentifier.value : null;
  };

  const compileBlockItem = (blockItem) => {
    const declaration = firstNonterminal(blockItem, 'declaration');
    if (declaration) {
      return compileLocalDeclaration(declaration, context);
    }

    const statement = firstNonterminal(blockItem, 'statement');
    if (statement) {
      return compileStatement(statement, context);
    }

    return [];
  };

  pushScope(context);

  try {
    let index = 0;
    while (index < blockItems.length) {
      let nextLabelIndex = -1;
      let nextLabelName = null;

      for (let scan = index; scan < blockItems.length; scan += 1) {
        const candidateLabel = getUserLabelFromBlockItem(blockItems[scan]);
        if (candidateLabel) {
          nextLabelIndex = scan;
          nextLabelName = candidateLabel;
          break;
        }
      }

      if (nextLabelIndex < 0 || nextLabelIndex === index) {
        instructions.push(...compileBlockItem(blockItems[index]));
        index += 1;
        continue;
      }

      const gotoLabel = sanitizeIdentifier(nextLabelName);
      instructions.push(`block $${gotoLabel}`);
      context.gotoLabelStack.push(gotoLabel);
      try {
        for (let cursor = index; cursor < nextLabelIndex; cursor += 1) {
          instructions.push(...compileBlockItem(blockItems[cursor]));
        }
      } finally {
        context.gotoLabelStack.pop();
      }
      instructions.push('end');

      instructions.push(...compileBlockItem(blockItems[nextLabelIndex]));
      index = nextLabelIndex + 1;
    }
  } finally {
    popScope(context);
  }

  return instructions;
}

function compileLocalDeclaration(declarationNode, context) {
  const instructions = [];

  for (const localDef of extractDeclarationItems(declarationNode, context.module)) {
    const structLayout = localDef.typeKind === 'struct'
      ? resolveStructLayout(localDef.structName || null, context.module, localDef.structLayout || null)
      : null;

    const localEntry = {
      sourceName: localDef.sourceName,
      name: allocateUniqueLocalName(context, localDef.name),
      cType: localDef.cType,
      typeKind: localDef.typeKind,
      structName: localDef.structName || null,
      structLayout,
      watType: localDef.watType,
      baseWatType: localDef.baseWatType,
      pointerDepth: localDef.pointerDepth || 0,
      pointeeArrayDimensions: Array.isArray(localDef.pointeeArrayDimensions) ? [...localDef.pointeeArrayDimensions] : [],
      declaredAsArray: !!localDef.declaredAsArray,
      isStruct: !!localDef.isStruct,
      isArray: !!localDef.isArray,
      arrayLength: localDef.arrayLength || null,
      arrayDimensions: Array.isArray(localDef.arrayDimensions) ? [...localDef.arrayDimensions] : []
    };

    if (localDef.typeKind === 'struct' && !structLayout && localDef.pointerDepth === 0) {
      throw new CompilationError(`Unknown struct type for '${localDef.sourceName}'`, getNodeName(declarationNode));
    }

    if (context.usesLinearMemory) {
      allocateStackSlot(context, localEntry);
    }

    registerScopedLocal(context, localEntry, getNodeName(declarationNode));
    context.function.locals.push(localEntry);

    if (localDef.initializer) {
      if (localEntry.isArray || localEntry.isStruct) {
        instructions.push(...compileAggregateInitializer(localEntry, localDef.initializer, context));
      } else {
        const rhsInstructions = compileInitializerValue(localDef.initializer, context, localEntry.watType || 'i32');
        if (context.usesLinearMemory) {
          instructions.push(...emitStoreInstructions(localEntry.sourceName, rhsInstructions, context, false));
        } else {
          instructions.push(...rhsInstructions);
          instructions.push(`local.set $${localEntry.name}`);
        }
      }
    }
  }

  return instructions;
}

function getZeroValueInstructions(watType = 'i32') {
  switch (watType) {
    case 'i64': return ['i64.const 0'];
    case 'f32': return ['f32.const 0'];
    case 'f64': return ['f64.const 0'];
    default: return ['i32.const 0'];
  }
}

function getInitializerElements(initializerNode) {
  if (!initializerNode) {
    return [];
  }

  const initializerList = firstNonterminal(initializerNode, 'initializerList');
  if (initializerList) {
    return nonterminalChildren(initializerList, 'initializer');
  }

  return [initializerNode];
}

function inferInitializerValueType(initializerNode, context) {
  const elements = getInitializerElements(initializerNode);
  const targetNode = elements[0] || initializerNode;
  return targetNode ? (inferExpressionType(targetNode, context) || 'i32') : 'i32';
}

function compileInitializerValue(initializerNode, context, expectedType = null) {
  const elements = getInitializerElements(initializerNode);
  if (elements.length > 1) {
    throw new CompilationError('Nested aggregate initializers are not supported yet', getNodeName(initializerNode));
  }

  const targetNode = elements[0] || initializerNode;
  const instructions = targetNode ? compileExpression(targetNode, context, { keepValue: true }) : ['i32.const 0'];
  if (!expectedType) {
    return instructions;
  }

  return coerceInstructionsToType(instructions, inferInitializerValueType(initializerNode, context), expectedType, context);
}

function getStringLiteralInitializerValues(initializerNode) {
  if (!initializerNode) {
    return null;
  }

  const initializerList = firstNonterminal(initializerNode, 'initializerList');
  if (initializerList) {
    return null;
  }

  const stringLiteral = findFirstTerminal(initializerNode, 'StringLiteral');
  return stringLiteral ? parseCStringLiteral(stringLiteral.value) : null;
}

function withAddressOffset(addressInstructions, offset = 0) {
  if (!offset) {
    return [...addressInstructions];
  }

  return [
    ...addressInstructions,
    `i32.const ${offset}`,
    'i32.add'
  ];
}

function getArrayElementDescriptor(targetInfo) {
  const dimensions = getSymbolArrayDimensions(targetInfo);
  if (dimensions.length === 0) {
    return null;
  }

  const remainingDimensions = dimensions.slice(1);
  const baseWatType = targetInfo.baseWatType || targetInfo.watType || 'i32';

  return {
    sourceName: targetInfo.sourceName,
    name: targetInfo.name,
    cType: targetInfo.cType,
    typeKind: targetInfo.typeKind,
    structName: targetInfo.structName || null,
    structLayout: targetInfo.structLayout || null,
    isStruct: !!targetInfo.isStruct,
    pointerDepth: targetInfo.pointerDepth || 0,
    baseWatType,
    watType: (remainingDimensions.length > 0 || targetInfo.isStruct || (targetInfo.pointerDepth || 0) > 0)
      ? 'i32'
      : baseWatType,
    isArray: remainingDimensions.length > 0,
    arrayLength: remainingDimensions.length > 0 ? (remainingDimensions[0] ?? null) : null,
    arrayDimensions: remainingDimensions
  };
}

function compileZeroInitializerToAddress(targetInfo, addressInstructions, context) {
  if (targetInfo.isArray) {
    const declaredLength = targetInfo.arrayLength || getSymbolArrayDimensions(targetInfo)[0] || 0;
    const elementDescriptor = getArrayElementDescriptor(targetInfo);
    const stride = getSymbolSize(elementDescriptor || { watType: targetInfo.baseWatType || targetInfo.watType || 'i32' });
    const instructions = [];

    for (let index = 0; index < declaredLength; index += 1) {
      instructions.push(
        ...compileZeroInitializerToAddress(
          elementDescriptor,
          withAddressOffset(addressInstructions, index * stride),
          context
        )
      );
    }

    return instructions;
  }

  if (targetInfo.isStruct) {
    const structLayout = resolveStructLayout(targetInfo.structName || null, context.module, targetInfo.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct type for '${targetInfo.sourceName}'`, targetInfo.sourceName);
    }

    const instructions = [];
    for (const field of structLayout.fields) {
      instructions.push(
        ...compileZeroInitializerToAddress(
          field,
          withAddressOffset(addressInstructions, field.offset),
          context
        )
      );
    }
    return instructions;
  }

  const valueType = targetInfo.baseWatType || targetInfo.watType || 'i32';
  return emitStoreToAddress(addressInstructions, getZeroValueInstructions(valueType), valueType, context, false);
}

function flattenInitializerSequence(initializerNode, output = []) {
  if (!initializerNode) {
    return output;
  }

  const initializerList = firstNonterminal(initializerNode, 'initializerList');
  if (!initializerList) {
    output.push(initializerNode);
    return output;
  }

  for (const child of nonterminalChildren(initializerList, 'initializer')) {
    flattenInitializerSequence(child, output);
  }

  return output;
}

function getInitializerListEntries(initializerNode) {
  if (!initializerNode) {
    return [];
  }

  const initializerList = firstNonterminal(initializerNode, 'initializerList');
  if (!initializerList) {
    return [{ designation: null, initializer: initializerNode }];
  }

  const entries = [];
  let pendingDesignation = null;
  for (const child of childNodes(initializerList)) {
    if (isNonterminal(child, 'designation')) {
      pendingDesignation = child;
      continue;
    }
    if (isNonterminal(child, 'initializer')) {
      entries.push({
        designation: pendingDesignation,
        initializer: child
      });
      pendingDesignation = null;
    }
  }

  return entries;
}

function extractDesignationPath(designationNode, context) {
  if (!designationNode) {
    return [];
  }

  const designatorList = firstNonterminal(designationNode, 'designatorList');
  if (!designatorList) {
    return [];
  }

  const enumValues = (context && context.module && context.module.enumValues) || new Map();
  const path = [];
  for (const designator of nonterminalChildren(designatorList, 'designator')) {
    if (findFirstTerminal(designator, 'TOKEN__2E_')) {
      const fieldIdentifier = findFirstTerminal(designator, 'Identifier');
      if (!fieldIdentifier || !fieldIdentifier.value) {
        throw new CompilationError('Invalid field designator in initializer', getNodeName(designator));
      }
      const fieldParts = String(fieldIdentifier.value)
        .split('.')
        .map((part) => part.trim())
        .filter(Boolean);
      for (const fieldName of fieldParts) {
        path.push({ kind: 'field', fieldName });
      }
      continue;
    }

    if (findFirstTerminal(designator, 'TOKEN__5B_')) {
      const indexExpression = findFirstNonterminal(designator, 'constantExpression');
      const integerTerminal = findFirstTerminal(designator, 'IntegerConstant');
      const characterTerminal = findFirstTerminal(designator, 'CharacterConstant');
      const index = integerTerminal
        ? parseCIntegerLiteral(integerTerminal.value)
        : (characterTerminal
          ? parseCCharacterLiteral(characterTerminal.value)
          : (indexExpression ? evaluateConstantExpression(indexExpression, enumValues) : 0));
      if (!Number.isInteger(index) || index < 0) {
        throw new CompilationError(`Array designator index must be a non-negative integer (got '${index}')`, getNodeName(designator));
      }
      path.push({ kind: 'index', index });
    }
  }

  return path;
}

function resolveAggregateTargetPath(targetInfo, addressInstructions, path, context) {
  let currentTarget = targetInfo;
  let currentAddress = [...addressInstructions];

  for (const segment of path) {
    if (segment.kind === 'field') {
      if (!currentTarget || !currentTarget.isStruct) {
        throw new CompilationError(
          `Field designator '.${segment.fieldName}' requires struct target`,
          currentTarget ? currentTarget.sourceName : 'initializer'
        );
      }

      const structLayout = resolveStructLayout(
        currentTarget.structName || null,
        context.module,
        currentTarget.structLayout || null
      );
      if (!structLayout) {
        throw new CompilationError(`Unknown struct type for '${currentTarget.sourceName}'`, currentTarget.sourceName);
      }

      const field = structLayout.fieldsByName.get(segment.fieldName);
      if (!field) {
        throw new CompilationError(
          `Unknown field '${segment.fieldName}' in struct '${currentTarget.structName || 'anonymous'}'`,
          currentTarget.sourceName
        );
      }

      currentAddress = withAddressOffset(currentAddress, field.offset || 0);
      currentTarget = field;
      continue;
    }

    if (segment.kind === 'index') {
      if (!currentTarget || !currentTarget.isArray) {
        throw new CompilationError(
          `Array designator '[${segment.index}]' requires array target`,
          currentTarget ? currentTarget.sourceName : 'initializer'
        );
      }

      const declaredLength = currentTarget.arrayLength || getSymbolArrayDimensions(currentTarget)[0] || 0;
      if (declaredLength > 0 && segment.index >= declaredLength) {
        throw new CompilationError(
          `Array designator index ${segment.index} is out of bounds for '${currentTarget.sourceName}'`,
          currentTarget.sourceName
        );
      }

      const elementDescriptor = getArrayElementDescriptor(currentTarget);
      if (!elementDescriptor) {
        throw new CompilationError(`Array '${currentTarget.sourceName}' has no element descriptor`, currentTarget.sourceName);
      }

      const stride = getSymbolSize(elementDescriptor);
      currentAddress = withAddressOffset(currentAddress, segment.index * stride);
      currentTarget = elementDescriptor;
    }
  }

  return {
    targetInfo: currentTarget,
    addressInstructions: currentAddress
  };
}

function resolveAggregateEntryByIndex(targetInfo, addressInstructions, index, context) {
  if (targetInfo.isArray) {
    const declaredLength = targetInfo.arrayLength || getSymbolArrayDimensions(targetInfo)[0] || 0;
    if (declaredLength > 0 && index >= declaredLength) {
      throw new CompilationError(`Too many initializer elements for array '${targetInfo.sourceName}'`, targetInfo.sourceName);
    }
    const elementDescriptor = getArrayElementDescriptor(targetInfo);
    if (!elementDescriptor) {
      throw new CompilationError(`Array '${targetInfo.sourceName}' has no element descriptor`, targetInfo.sourceName);
    }
    const stride = getSymbolSize(elementDescriptor);
    return {
      targetInfo: elementDescriptor,
      addressInstructions: withAddressOffset(addressInstructions, index * stride)
    };
  }

  if (targetInfo.isStruct) {
    const structLayout = resolveStructLayout(targetInfo.structName || null, context.module, targetInfo.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct type for '${targetInfo.sourceName}'`, targetInfo.sourceName);
    }
    if (index >= structLayout.fields.length) {
      throw new CompilationError(`Too many initializer elements for struct '${targetInfo.sourceName}'`, targetInfo.sourceName);
    }
    const field = structLayout.fields[index];
    return {
      targetInfo: field,
      addressInstructions: withAddressOffset(addressInstructions, field.offset || 0)
    };
  }

  throw new CompilationError(`Designated initialization requires aggregate target ('${targetInfo.sourceName}')`, targetInfo.sourceName);
}

function compileInitializerNodeToAddress(targetInfo, initializerNode, addressInstructions, context) {
  const hasInitializerList = !!firstNonterminal(initializerNode, 'initializerList');

  if (targetInfo.isArray || targetInfo.isStruct) {
    if (!hasInitializerList && targetInfo.isArray) {
      throw new CompilationError(
        `Array initialization currently requires brace initializers for '${targetInfo.sourceName}'`,
        targetInfo.sourceName
      );
    }
    return compileAggregateInitializerToAddress(targetInfo, initializerNode, addressInstructions, context);
  }

  const valueType = targetInfo.baseWatType || targetInfo.watType || 'i32';
  const valueInstructions = compileInitializerValue(initializerNode, context, valueType);
  return emitStoreToAddress(addressInstructions, valueInstructions, valueType, context, false);
}

function compileDesignatedAggregateInitializerToAddress(targetInfo, initializerNode, addressInstructions, context) {
  const entries = getInitializerListEntries(initializerNode);
  const instructions = compileZeroInitializerToAddress(targetInfo, addressInstructions, context);
  let nextSequentialIndex = 0;

  for (const entry of entries) {
    const designationPath = extractDesignationPath(entry.designation, context);

    let resolved = null;
    if (designationPath.length > 0) {
      resolved = resolveAggregateTargetPath(targetInfo, addressInstructions, designationPath, context);

      const firstSegment = designationPath[0];
      if (firstSegment.kind === 'index') {
        nextSequentialIndex = firstSegment.index + 1;
      } else if (firstSegment.kind === 'field' && targetInfo.isStruct) {
        const structLayout = resolveStructLayout(targetInfo.structName || null, context.module, targetInfo.structLayout || null);
        if (structLayout) {
          const fieldIndex = structLayout.fields.findIndex((field) => field.sourceName === firstSegment.fieldName);
          if (fieldIndex >= 0) {
            nextSequentialIndex = fieldIndex + 1;
          }
        }
      }
    } else {
      resolved = resolveAggregateEntryByIndex(targetInfo, addressInstructions, nextSequentialIndex, context);
      nextSequentialIndex += 1;
    }

    instructions.push(
      ...compileInitializerNodeToAddress(
        resolved.targetInfo,
        entry.initializer,
        resolved.addressInstructions,
        context
      )
    );
  }

  return instructions;
}

function consumeAggregateInitializerValuesToAddress(targetInfo, initializerValues, state, addressInstructions, context) {
  if (targetInfo.isArray) {
    const declaredLength = targetInfo.arrayLength || getSymbolArrayDimensions(targetInfo)[0] || 0;
    const elementDescriptor = getArrayElementDescriptor(targetInfo);
    const elementType = elementDescriptor && !elementDescriptor.isArray && !elementDescriptor.isStruct
      ? (elementDescriptor.baseWatType || elementDescriptor.watType || 'i32')
      : (targetInfo.baseWatType || targetInfo.watType || 'i32');
    const stride = getSymbolSize(elementDescriptor || { watType: elementType });
    const instructions = [];

    for (let index = 0; index < declaredLength; index += 1) {
      const elementAddress = withAddressOffset(addressInstructions, index * stride);
      if (elementDescriptor && (elementDescriptor.isArray || elementDescriptor.isStruct)) {
        instructions.push(
          ...consumeAggregateInitializerValuesToAddress(
            elementDescriptor,
            initializerValues,
            state,
            elementAddress,
            context
          )
        );
      } else if (state.index < initializerValues.length) {
        const valueInstructions = compileInitializerValue(initializerValues[state.index], context, elementType);
        state.index += 1;
        instructions.push(...emitStoreToAddress(elementAddress, valueInstructions, elementType, context, false));
      } else {
        instructions.push(...compileZeroInitializerToAddress(elementDescriptor || targetInfo, elementAddress, context));
      }
    }

    return instructions;
  }

  if (targetInfo.isStruct) {
    const structLayout = resolveStructLayout(targetInfo.structName || null, context.module, targetInfo.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct type for '${targetInfo.sourceName}'`, targetInfo.sourceName);
    }

    const instructions = [];
    for (const field of structLayout.fields) {
      const fieldAddress = withAddressOffset(addressInstructions, field.offset);
      if (field.isArray || field.isStruct) {
        instructions.push(
          ...consumeAggregateInitializerValuesToAddress(
            field,
            initializerValues,
            state,
            fieldAddress,
            context
          )
        );
      } else if (state.index < initializerValues.length) {
        const valueType = field.baseWatType || field.watType || 'i32';
        const valueInstructions = compileInitializerValue(initializerValues[state.index], context, valueType);
        state.index += 1;
        instructions.push(...emitStoreToAddress(fieldAddress, valueInstructions, valueType, context, false));
      } else {
        instructions.push(...compileZeroInitializerToAddress(field, fieldAddress, context));
      }
    }

    return instructions;
  }

  if (state.index < initializerValues.length) {
    const valueType = targetInfo.baseWatType || targetInfo.watType || 'i32';
    const valueInstructions = compileInitializerValue(initializerValues[state.index], context, valueType);
    state.index += 1;
    return emitStoreToAddress(addressInstructions, valueInstructions, valueType, context, false);
  }

  return compileZeroInitializerToAddress(targetInfo, addressInstructions, context);
}

function compileAggregateInitializerToAddress(targetInfo, initializerNode, addressInstructions, context) {
  const initializerEntries = getInitializerListEntries(initializerNode);
  const hasDesignation = initializerEntries.some((entry) => !!entry.designation);

  if (hasDesignation) {
    if (!targetInfo.isArray && !targetInfo.isStruct) {
      throw new CompilationError(
        `Designated initialization requires aggregate target ('${targetInfo.sourceName}')`,
        targetInfo.sourceName
      );
    }
    return compileDesignatedAggregateInitializerToAddress(targetInfo, initializerNode, addressInstructions, context);
  }

  if (targetInfo.isArray) {
    const declaredLength = targetInfo.arrayLength || getSymbolArrayDimensions(targetInfo)[0] || 0;
    const stringValues = getStringLiteralInitializerValues(initializerNode);
    const hasInitializerList = !!firstNonterminal(initializerNode, 'initializerList');
    const elementDescriptor = getArrayElementDescriptor(targetInfo);
    const elementType = elementDescriptor && !elementDescriptor.isArray && !elementDescriptor.isStruct
      ? (elementDescriptor.baseWatType || elementDescriptor.watType || 'i32')
      : (targetInfo.baseWatType || 'i32');
    const stride = getSymbolSize(elementDescriptor || { watType: elementType });

    if (!declaredLength) {
      throw new CompilationError(`Array '${targetInfo.sourceName}' requires a fixed length for initialization`, targetInfo.sourceName);
    }

    if (stringValues) {
      if (!String(targetInfo.cType || '').includes('char') || (elementDescriptor && (elementDescriptor.isArray || elementDescriptor.isStruct))) {
        throw new CompilationError(
          `String literal array initialization is currently supported only for flat char arrays ('${targetInfo.sourceName}')`,
          targetInfo.sourceName
        );
      }

      if (stringValues.length > declaredLength) {
        throw new CompilationError(`String literal is too large for array '${targetInfo.sourceName}'`, targetInfo.sourceName);
      }

      const instructions = [];
      const paddedValues = [...stringValues];
      if (paddedValues.length < declaredLength) {
        paddedValues.push(0);
      }
      while (paddedValues.length < declaredLength) {
        paddedValues.push(0);
      }

      for (let index = 0; index < declaredLength; index += 1) {
        instructions.push(
          ...emitStoreToAddress(
            withAddressOffset(addressInstructions, index * stride),
            [`i32.const ${paddedValues[index] ?? 0}`],
            elementType,
            context,
            false
          )
        );
      }

      return instructions;
    }

    if (!hasInitializerList) {
      throw new CompilationError(
        `Array initialization currently requires brace initializers for '${targetInfo.sourceName}'`,
        targetInfo.sourceName
      );
    }
  } else if (targetInfo.isStruct && !firstNonterminal(initializerNode, 'initializerList')) {
    // Struct copy initialization: copy bytes from source struct to destination
    const structSize = (targetInfo.structLayout && targetInfo.structLayout.size) || getSymbolSize(targetInfo);
    const sourceExprNode = firstNonterminal(initializerNode, 'expression') || 
                          firstNonterminal(initializerNode, 'assignmentExpression') ||
                          initializerNode;
    
    // Compile the source expression to get its address (should be an identifier or address-of expression)
    const sourceExprInstructions = compileExpression(sourceExprNode, context, { keepValue: true });
    
    // Generate memory copy instructions: copy structSize bytes from source to destination
    // Strategy: copy word-by-word (i32 = 4 bytes) for efficiency, then remainder bytes
    const wordCount = Math.floor(structSize / 4);
    const remainderBytes = structSize % 4;
    
    const instructions = [];
    
    // Copy word-by-word (4 bytes at a time)
    for (let offset = 0; offset < wordCount * 4; offset += 4) {
      // Destination address
      const destAddr = withAddressOffset(addressInstructions, offset);
      // Source address
      const srcAddr = [
        ...sourceExprInstructions,
        `i32.const ${offset}`,
        'i32.add'
      ];
      
      instructions.push(
        ...destAddr,           // destination address on stack
        ...srcAddr,            // source address on stack for load
        'i32.load',            // load from source
        'i32.store'            // store to destination
      );
    }
    
    // Copy remainder bytes individually (1 byte at a time)
    let byteOffset = wordCount * 4;
    for (let i = 0; i < remainderBytes; i += 1) {
      const destAddr = withAddressOffset(addressInstructions, byteOffset);
      const srcAddr = [
        ...sourceExprInstructions,
        `i32.const ${byteOffset}`,
        'i32.add'
      ];
      
      instructions.push(
        ...destAddr,           // destination address on stack
        ...srcAddr,            // source address on stack for load
        'i32.load8_u',         // load 1 byte from source (unsigned)
        'i32.store8'           // store to destination (1 byte)
      );
      byteOffset += 1;
    }
    
    return instructions;
  }

  const initializerValues = flattenInitializerSequence(initializerNode);
  const state = { index: 0 };
  const instructions = consumeAggregateInitializerValuesToAddress(
    targetInfo,
    initializerValues,
    state,
    addressInstructions,
    context
  );

  if (state.index < initializerValues.length) {
    const aggregateKind = targetInfo.isArray ? 'array' : (targetInfo.isStruct ? 'struct' : 'object');
    throw new CompilationError(`Too many initializer elements for ${aggregateKind} '${targetInfo.sourceName}'`, targetInfo.sourceName);
  }

  return instructions;
}

function compileAggregateInitializer(localEntry, initializerNode, context) {
  return compileAggregateInitializerToAddress(
    localEntry,
    initializerNode,
    emitAddressOfSymbol(localEntry.sourceName, context),
    context
  );
}

function compileArrayInitializer(localEntry, initializerNode, context) {
  return compileAggregateInitializer(localEntry, initializerNode, context);
}

function ensureInternalLocal(context, baseName, watType = 'i32') {
  const key = `${baseName}:${watType}`;
  if (!context.internalLocals.has(key)) {
    const localEntry = {
      sourceName: baseName,
      name: sanitizeIdentifier(baseName),
      watType,
      internal: true
    };
    context.internalLocals.set(key, localEntry);
    context.function.locals.push(localEntry);
  }
  return context.internalLocals.get(key);
}

function allocateStackSlot(context, symbol) {
  if (!context.usesLinearMemory || !symbol || symbol.stackOffset != null) {
    return symbol ? symbol.stackOffset : null;
  }

  const size = getSymbolSize(symbol);
  const alignment = size >= 8 ? 8 : 4;
  context.frameSize = alignTo(context.frameSize, alignment);
  symbol.stackOffset = context.frameSize;
  context.frameSize += size;
  return symbol.stackOffset;
}

function buildFunctionPrologue(context) {
  if (!context.usesLinearMemory) {
    return [];
  }

  const frameLocal = ensureInternalLocal(context, '__frame', 'i32');
  const parentFrameLocal = ensureInternalLocal(context, '__parent_frame', 'i32');
  const frameSize = alignTo(context.frameSize, 8);
  const instructions = [
    'global.get $__frame_ptr',
    `local.set $${parentFrameLocal.name}`,
    'global.get $__stack_ptr',
    `local.set $${frameLocal.name}`,
    `local.get $${frameLocal.name}`,
    'global.set $__frame_ptr'
  ];

  if (frameSize > 0) {
    instructions.push(
      'global.get $__stack_ptr',
      `i32.const ${frameSize}`,
      'i32.add',
      'global.set $__stack_ptr'
    );
  }

  for (const param of context.params.values()) {
    if (param.stackOffset == null) continue;
    instructions.push(
      ...emitStoreToAddress(
        emitAddressOfSymbol(param.sourceName, context),
        [`local.get $${param.name}`],
        param.watType,
        context,
        false
      )
    );
  }

  return instructions;
}

function buildFunctionEpilogue(context) {
  if (!context.usesLinearMemory) {
    return [];
  }

  const frameLocal = ensureInternalLocal(context, '__frame', 'i32');
  const parentFrameLocal = ensureInternalLocal(context, '__parent_frame', 'i32');
  return [
    `local.get $${parentFrameLocal.name}`,
    'global.set $__frame_ptr',
    `local.get $${frameLocal.name}`,
    'global.set $__stack_ptr'
  ];
}

function createLabel(context, prefix) {
  const id = context.nextLabelId++;
  return sanitizeIdentifier(`${context.function.name}_${prefix}_${id}`);
}

function compileStatement(statementNode, context) {
  const directChild = isNonterminal(statementNode, 'statement')
    ? (nonterminalChildren(statementNode)[0] || null)
    : statementNode;
  if (!directChild) return [];

  const statementType = getNodeName(directChild);

  if (statementType === 'jumpStatement') {
    return compileJumpStatement(directChild, context);
  }

  if (statementType === 'expressionStatement') {
    const expressionNode = firstNonterminal(directChild, 'expression');
    if (!expressionNode) return [];

    const instructions = compileExpression(expressionNode, context, { keepValue: true });
    const produces = expressionProducesValue(expressionNode, context);
    if (produces) {
      instructions.push('drop');
    }
    return instructions;
  }

  if (statementType === 'compoundStatement') {
    return compileCompoundStatement(directChild, context);
  }

  if (statementType === 'selectionStatement') {
    return compileSelectionStatement(directChild, context);
  }

  if (statementType === 'labeledStatement') {
    return compileLabeledStatement(directChild, context);
  }

  if (statementType === 'iterationStatement') {
    return compileIterationStatement(directChild, context);
  }

  throw new CompilationError(`Unsupported statement type: ${statementType}`, statementType);
}

function compileJumpStatement(jumpNode, context) {
  const jumpKeyword = childNodes(jumpNode).find(
    (child) => child.kind === 'terminal' && ['TOKEN_return', 'TOKEN_break', 'TOKEN_continue', 'TOKEN_goto'].includes(child.token)
  );

  if (!jumpKeyword) {
    throw new CompilationError('Unsupported jump statement', getNodeName(jumpNode));
  }

  if (jumpKeyword.token === 'TOKEN_return') {
    const expressionNode = firstNonterminal(jumpNode, 'expression');
    if (!expressionNode) {
      return [
        ...buildFunctionEpilogue(context),
        'return'
      ];
    }

    const returnType = context.function.resultType || 'i32';
    const expressionType = inferExpressionType(expressionNode, context) || returnType;
    return [
      ...coerceInstructionsToType(
        compileExpression(expressionNode, context, { keepValue: true }),
        expressionType,
        returnType,
        context
      ),
      ...buildFunctionEpilogue(context),
      'return'
    ];
  }

  if (jumpKeyword.token === 'TOKEN_break') {
    const activeBreak = context.breakStack[context.breakStack.length - 1];
    if (!activeBreak) {
      throw new CompilationError(`'${jumpKeyword.value}' used outside a loop or switch`, getNodeName(jumpNode));
    }
    return [`br $${activeBreak.breakLabel}`];
  }

  if (jumpKeyword.token === 'TOKEN_continue') {
    const activeLoop = context.loopStack[context.loopStack.length - 1];
    if (!activeLoop) {
      throw new CompilationError(`'${jumpKeyword.value}' used outside a loop`, getNodeName(jumpNode));
    }
    return [`br $${activeLoop.continueLabel}`];
  }

  if (jumpKeyword.token === 'TOKEN_goto') {
    const labelToken = childNodes(jumpNode).find((child) => child.kind === 'terminal' && child.token === 'Identifier');
    if (!labelToken || !labelToken.value) {
      throw new CompilationError('Malformed goto statement', getNodeName(jumpNode));
    }

    const targetLabel = sanitizeIdentifier(labelToken.value);
    if (!context.gotoLabelStack.includes(targetLabel)) {
      throw new CompilationError(
        `Unsupported goto target '${labelToken.value}'. Only forward goto inside the same compound block is currently supported`,
        getNodeName(jumpNode)
      );
    }

    return [`br $${targetLabel}`];
  }

  throw new CompilationError(`Unsupported jump keyword '${jumpKeyword.value}'`, getNodeName(jumpNode));
}

function unwrapStatementNode(statementNode) {
  if (!statementNode) {
    return null;
  }

  if (isNonterminal(statementNode, 'statement')) {
    return nonterminalChildren(statementNode)[0] || null;
  }

  return statementNode;
}

function collectSwitchSections(statementNode, context) {
  const directNode = unwrapStatementNode(statementNode);
  const sections = [];
  let currentSection = null;

  const ensureCurrentSection = () => {
    if (!currentSection) {
      currentSection = { labels: [], items: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  const appendStatementItem = (statement) => {
    const targetStatement = unwrapStatementNode(statement);
    if (!targetStatement) {
      return;
    }
    ensureCurrentSection().items.push({ kind: 'statement', node: targetStatement });
  };

  if (!isNonterminal(directNode, 'compoundStatement')) {
    appendStatementItem(directNode);
    return sections;
  }

  for (const blockItem of nonterminalChildren(directNode, 'blockItem')) {
    const declaration = firstNonterminal(blockItem, 'declaration');
    if (declaration) {
      ensureCurrentSection().items.push({ kind: 'declaration', node: declaration });
      continue;
    }

    let statement = firstNonterminal(blockItem, 'statement');
    if (!statement) {
      continue;
    }

    const labels = [];
    let currentNode = unwrapStatementNode(statement);

    while (isNonterminal(currentNode, 'labeledStatement')) {
      if (firstTerminal(currentNode, 'TOKEN_case')) {
        const constantExpression = firstNonterminal(currentNode, 'constantExpression');
        const explicitInteger = constantExpression ? findFirstTerminal(constantExpression, 'IntegerConstant') : null;
        const explicitCharacter = constantExpression ? findFirstTerminal(constantExpression, 'CharacterConstant') : null;

        labels.push({
          kind: 'case',
          value: explicitInteger
            ? parseCIntegerLiteral(explicitInteger.value)
            : (explicitCharacter
              ? parseCCharacterLiteral(explicitCharacter.value)
              : evaluateConstantExpression(
                constantExpression,
                (context.module && context.module.enumValues) || new Map()
              ))
        });
        currentNode = unwrapStatementNode(firstNonterminal(currentNode, 'statement'));
        continue;
      }

      if (firstTerminal(currentNode, 'TOKEN_default')) {
        labels.push({ kind: 'default' });
        currentNode = unwrapStatementNode(firstNonterminal(currentNode, 'statement'));
        continue;
      }

      break;
    }

    if (labels.length > 0) {
      currentSection = { labels, items: [] };
      sections.push(currentSection);
    }

    appendStatementItem(currentNode);
  }

  return sections;
}

function buildSwitchMatchInstructions(section, switchValueLocal) {
  const caseLabels = (section.labels || []).filter((label) => label.kind === 'case');
  const hasDefault = (section.labels || []).some((label) => label.kind === 'default');

  if (hasDefault) {
    return ['i32.const 1'];
  }

  if (caseLabels.length === 0) {
    return ['i32.const 1'];
  }

  const instructions = [];
  caseLabels.forEach((label, index) => {
    instructions.push(
      `local.get $${switchValueLocal.name}`,
      `i32.const ${Number(label.value) || 0}`,
      'i32.eq'
    );
    if (index > 0) {
      instructions.push('i32.or');
    }
  });

  return instructions;
}

function compileSwitchSection(section, context) {
  const instructions = [];

  for (const item of section.items || []) {
    if (item.kind === 'declaration') {
      instructions.push(...compileLocalDeclaration(item.node, context));
    } else if (item.kind === 'statement') {
      instructions.push(...compileStatement(item.node, context));
    }
  }

  return instructions;
}

function compileSwitchStatement(selectionNode, context) {
  const conditionNode = firstNonterminal(selectionNode, 'expression');
  const statementNode = nonterminalChildren(selectionNode, 'statement')[0];

  if (!conditionNode || !statementNode) {
    throw new CompilationError('Malformed switch statement', getNodeName(selectionNode));
  }

  const breakLabel = createLabel(context, 'switch_exit');
  const switchValueLocal = ensureInternalLocal(context, createLabel(context, '__switch_value'), 'i32');
  const switchMatchedLocal = ensureInternalLocal(context, createLabel(context, '__switch_matched'), 'i32');
  const sections = collectSwitchSections(statementNode, context);

  const instructions = [
    ...compileExpression(conditionNode, context, { keepValue: true }),
    `local.set $${switchValueLocal.name}`,
    'i32.const 0',
    `local.set $${switchMatchedLocal.name}`,
    `block $${breakLabel}`
  ];

  context.breakStack.push({ breakLabel, kind: 'switch' });
  try {
    for (const section of sections) {
      const sectionInstructions = compileSwitchSection(section, context);

      if (!section.labels || section.labels.length === 0) {
        instructions.push(...sectionInstructions);
        continue;
      }

      instructions.push(
        `local.get $${switchMatchedLocal.name}`,
        'if',
        ...sectionInstructions,
        'else',
        ...buildSwitchMatchInstructions(section, switchValueLocal),
        'if',
        'i32.const 1',
        `local.set $${switchMatchedLocal.name}`,
        ...sectionInstructions,
        'end',
        'end'
      );
    }
  } finally {
    context.breakStack.pop();
  }

  instructions.push('end');
  return instructions;
}

function compileLabeledStatement(labeledNode, context) {
  const innerStatement = firstNonterminal(labeledNode, 'statement');
  if (!innerStatement) {
    return [];
  }
  return compileStatement(innerStatement, context);
}

function compileSelectionStatement(selectionNode, context) {
  if (firstTerminal(selectionNode, 'TOKEN_switch')) {
    return compileSwitchStatement(selectionNode, context);
  }

  const conditionNode = firstNonterminal(selectionNode, 'expression');
  const statementNodes = nonterminalChildren(selectionNode, 'statement');
  const hasElseBranch = !!firstTerminal(selectionNode, 'TOKEN_else');

  if (!conditionNode || statementNodes.length === 0) {
    throw new CompilationError('Malformed if statement', getNodeName(selectionNode));
  }

  const instructions = [
    ...compileBooleanValue(conditionNode, context),
    'if'
  ];

  instructions.push(...compileStatement(statementNodes[0], context));

  if (hasElseBranch) {
    instructions.push('else');
    if (statementNodes[1]) {
      instructions.push(...compileStatement(statementNodes[1], context));
    }
  }

  instructions.push('end');
  return instructions;
}

function compileSideEffectExpression(expressionNode, context) {
  if (!expressionNode) return [];

  const instructions = compileExpression(expressionNode, context, { keepValue: true });
  if (expressionProducesValue(expressionNode, context)) {
    instructions.push('drop');
  }
  return instructions;
}

function extractForLoopParts(iterationNode) {
  const parts = {
    init: null,
    initDeclaration: null,
    condition: null,
    update: null,
    body: null
  };

  let semicolonCount = 0;
  for (const child of childNodes(iterationNode)) {
    if (isTerminal(child, 'TOKEN__3B_')) {
      semicolonCount += 1;
      continue;
    }

    if (isNonterminal(child, 'statement')) {
      parts.body = child;
      continue;
    }

    if (semicolonCount === 0) {
      if (isNonterminal(child, 'expression') && !parts.init) {
        parts.init = child;
      } else if (isNonterminal(child, 'declaration') && !parts.initDeclaration) {
        parts.initDeclaration = child;
        // A declaration already includes its semicolon as a child node, so
        // the next expression encountered is the condition (not the update).
        semicolonCount = 1;
      }
      continue;
    }

    if (semicolonCount === 1 && isNonterminal(child, 'expression') && !parts.condition) {
      parts.condition = child;
      continue;
    }

    if (semicolonCount >= 2 && isNonterminal(child, 'expression')) {
      parts.update = child;
    }
  }

  return parts;
}

function compileIterationStatement(iterationNode, context) {
  if (firstTerminal(iterationNode, 'TOKEN_for')) {
    const parts = extractForLoopParts(iterationNode);
    if (!parts.body) {
      throw new CompilationError('Malformed for loop', getNodeName(iterationNode));
    }

    const breakLabel = createLabel(context, 'for_exit');
    const continueLabel = createLabel(context, 'for_continue');
    const loopLabel = createLabel(context, 'for_loop');
    const instructions = [];

    pushScope(context);
    try {
      if (parts.initDeclaration) {
        instructions.push(...compileLocalDeclaration(parts.initDeclaration, context));
      } else {
        instructions.push(...compileSideEffectExpression(parts.init, context));
      }

      instructions.push(
        `block $${breakLabel}`,
        `loop $${loopLabel}`
      );

      if (parts.condition) {
        instructions.push(
          ...compileBooleanValue(parts.condition, context),
          'i32.eqz',
          `br_if $${breakLabel}`
        );
      }

      instructions.push(`block $${continueLabel}`);

      const loopState = { breakLabel, continueLabel };
      context.loopStack.push(loopState);
      context.breakStack.push({ breakLabel, kind: 'loop' });
      try {
        instructions.push(...compileStatement(parts.body, context));
      } finally {
        context.breakStack.pop();
        context.loopStack.pop();
      }

      instructions.push(
        'end',
        ...compileSideEffectExpression(parts.update, context),
        `br $${loopLabel}`,
        'end',
        'end'
      );
    } finally {
      popScope(context);
    }

    return instructions;
  }

  if (firstTerminal(iterationNode, 'TOKEN_do')) {
    const bodyStatement = nonterminalChildren(iterationNode, 'statement')[0];
    const conditionNode = firstNonterminal(iterationNode, 'expression');

    if (!bodyStatement || !conditionNode) {
      throw new CompilationError('Malformed do-while loop', getNodeName(iterationNode));
    }

    const breakLabel = createLabel(context, 'do_exit');
    const continueLabel = createLabel(context, 'do_continue');
    const loopLabel = createLabel(context, 'do_loop');
    const instructions = [
      `block $${breakLabel}`,
      `loop $${loopLabel}`,
      `block $${continueLabel}`
    ];

    const loopState = { breakLabel, continueLabel };
    context.loopStack.push(loopState);
    context.breakStack.push({ breakLabel, kind: 'loop' });
    try {
      instructions.push(...compileStatement(bodyStatement, context));
    } finally {
      context.breakStack.pop();
      context.loopStack.pop();
    }

    instructions.push(
      'end',
      ...compileBooleanValue(conditionNode, context),
      `br_if $${loopLabel}`,
      'end',
      'end'
    );

    return instructions;
  }

  if (firstTerminal(iterationNode, 'TOKEN_while')) {
    const conditionNode = firstNonterminal(iterationNode, 'expression');
    const bodyStatement = nonterminalChildren(iterationNode, 'statement')[0];

    if (!conditionNode || !bodyStatement) {
      throw new CompilationError('Malformed while loop', getNodeName(iterationNode));
    }

    const breakLabel = createLabel(context, 'while_exit');
    const continueLabel = createLabel(context, 'while_loop');
    const instructions = [
      `block $${breakLabel}`,
      `loop $${continueLabel}`,
      ...compileBooleanValue(conditionNode, context),
      'i32.eqz',
      `br_if $${breakLabel}`
    ];

    const loopState = { breakLabel, continueLabel };
    context.loopStack.push(loopState);
    context.breakStack.push({ breakLabel, kind: 'loop' });
    try {
      instructions.push(...compileStatement(bodyStatement, context));
    } finally {
      context.breakStack.pop();
      context.loopStack.pop();
    }

    instructions.push(
      `br $${continueLabel}`,
      'end',
      'end'
    );

    return instructions;
  }

  throw new CompilationError('Unsupported iteration statement', getNodeName(iterationNode));
}

function expressionProducesValue(node, context) {
  if (!node) return false;

  const inferredType = inferExpressionType(node, context);
  if (inferredType !== null) {
    return true;
  }

  if (node.kind === 'terminal') {
    return ['IntegerConstant', 'CharacterConstant', 'FloatingConstant', 'Identifier'].includes(node.token);
  }

  const nodeName = getNodeName(node);
  if (nodeName && /expression$/i.test(nodeName)) {
    const postfixExpression = findFirstNonterminal(node, 'postfixExpression');
    const postfixSuffix = postfixExpression ? firstNonterminal(postfixExpression, 'postfixSuffix') : null;

    if (postfixSuffix) {
      const primaryExpression = firstNonterminal(postfixExpression, 'primaryExpression');
      const calleeName = extractIdentifierFromNode(primaryExpression);
      const fn = calleeName ? context.module.functionsByName.get(calleeName) : null;
      return !fn || fn.resultType !== null;
    }

    return true;
  }

  return false;
}

function inferExpressionType(node, context) {
  if (!node) return null;

  if (node.kind === 'terminal') {
    if (node.token === 'IntegerConstant' || node.token === 'CharacterConstant') return 'i32';
    if (node.token === 'FloatingConstant') {
      const raw = String(node.value || '').trim();
      return /[fF]$/.test(raw) ? 'f32' : 'f64';
    }
    if (node.token === 'Identifier') {
      const memberAccess = String(node.value || '').includes('.') ? resolveMemberAccess(node.value, context) : null;
      if (memberAccess) {
        return memberAccess.isStruct ? 'i32' : toWatType(memberAccess.watType);
      }

      const symbol = context.locals.get(node.value)
        || context.params.get(node.value)
        || context.module.globalsByName.get(node.value)
        || context.module.functionsByName.get(node.value);
      if (!symbol) return 'i32';
      // For function stubs the return type is authoritative – do NOT fall back
      // to 'i32' when resultType is null (void functions produce no value).
      if (Object.prototype.hasOwnProperty.call(symbol, 'resultType') && symbol.resultType === null
          && !Object.prototype.hasOwnProperty.call(symbol, 'watType')) {
        return null;
      }
      return symbol ? toWatType(symbol.watType || symbol.resultType || 'i32') : 'i32';
    }
    return null;
  }

  const nodeName = getNodeName(node);

  if (nodeName === 'primaryExpression') {
    const directTerminal = firstTerminal(node);
    if (directTerminal) {
      return inferExpressionType(directTerminal, context);
    }

    const nestedPrimaryChildren = nonterminalChildren(node);
    return nestedPrimaryChildren.length > 0
      ? inferExpressionType(nestedPrimaryChildren[0], context)
      : null;
  }

  if (nodeName === 'constant') {
    const directTerminal = firstTerminal(node);
    return directTerminal ? inferExpressionType(directTerminal, context) : null;
  }

  if (nodeName === 'postfixExpression') {
    const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
    if (accessInfo) {
      return accessInfo.resultIsAddress ? 'i32' : accessInfo.watType;
    }

    const primaryExpression = firstNonterminal(node, 'primaryExpression');
    const memberAccessPath = getMemberAccessPathFromPostfix(node);
    const baseName = getSimpleIdentifierName(primaryExpression);
    if (baseName && memberAccessPath.length > 0) {
      const memberAccess = resolvePostfixMemberAccess(baseName, memberAccessPath, context);
      if (memberAccess) {
        if (memberAccess.isStruct || memberAccess.isArray || memberAccess.pointerDepth > 0) {
          return 'i32';
        }
        return toWatType(memberAccess.watType || 'i32');
      }
    }

    const indexExpressions = getIndexExpressionsFromPostfix(node);
    if (indexExpressions.length > 0) {
      return 'i32';
    }

    const postfixSuffix = firstNonterminal(node, 'postfixSuffix');
    if (postfixSuffix) {
      const calleeName = extractIdentifierFromNode(primaryExpression);
      const fn = context.module.functionsByName.get(calleeName);
      if (fn) {
        return fn.resultType;
      }

      const imported = (context.module.imports || []).find(
        (importDef) => importDef && (importDef.sourceName === calleeName || importDef.field === calleeName)
      );
      if (imported) {
        return imported.resultType;
      }

      if (calleeName === 'longjmp' || calleeName === 'rewind' || calleeName === 'clearerr') {
        return null;
      }

      return 'i32';
    }
  }

  if (nodeName === 'unaryExpression') {
    if (firstTerminal(node, 'TOKEN_sizeof')) {
      return 'i32';
    }

    const directOperator = childNodes(node).find(
      (child) => child.kind === 'terminal' && ['TOKEN__2B__2B_', 'TOKEN__2D__2D_'].includes(child.token)
    );
    if (directOperator) {
      const operandNode = nonterminalChildren(node)[0];
      return inferExpressionType(operandNode, context) || 'i32';
    }

    const unaryOperatorNode = firstNonterminal(node, 'unaryOperator');
    if (unaryOperatorNode) {
      const operatorTerminal = firstTerminal(unaryOperatorNode);
      const operandNode = nonterminalChildren(node).find((child) => child !== unaryOperatorNode);

      if (operatorTerminal) {
        switch (operatorTerminal.token) {
          case 'TOKEN__26_':
            return 'i32';
          case 'TOKEN__2A_':
            return inferPointerPointeeType(operandNode, context);
          case 'TOKEN__21_':
            return 'i32';
          default:
            return inferExpressionType(operandNode, context) || 'i32';
        }
      }
    }
  }

  if (nodeName === 'postfixExpression') {
    const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
    if (accessInfo) {
      return accessInfo.resultIsAddress ? 'i32' : accessInfo.watType;
    }

    const indexExpressions = getIndexExpressionsFromPostfix(node);
    if (indexExpressions.length > 0) {
      return 'i32';
    }
  }

  if (['equalityExpression', 'relationalExpression', 'logicalOrExpression', 'logicalAndExpression'].includes(nodeName)) {
    const terminals = terminalChildren(node);
    if (terminals.length > 0) return 'i32';
  }

  if (nodeName === 'conditionalExpression' && firstTerminal(node, 'TOKEN__3F_')) {
    const trueNode = firstNonterminal(node, 'expression');
    const conditionalChildren = nonterminalChildren(node, 'conditionalExpression');
    const falseNode = conditionalChildren[conditionalChildren.length - 1] || null;
    return selectCommonWatType(
      inferExpressionType(trueNode, context) || 'i32',
      inferExpressionType(falseNode, context) || 'i32'
    );
  }

  if (nodeName === 'castExpression') {
    const typeNameNode = firstNonterminal(node, 'typeName');
    if (typeNameNode) {
      return extractTypeInfoFromTypeName(typeNameNode).watType || 'i32';
    }
  }

  if (nodeName === 'assignmentExpression') {
    const nestedChildren = nonterminalChildren(node);
    if (nestedChildren.length >= 3 && firstNonterminal(node, 'assignmentOperator')) {
      return inferExpressionType(nestedChildren[nestedChildren.length - 1], context);
    }
  }

  if (nodeName === 'expression') {
    const assignmentExpressions = nonterminalChildren(node, 'assignmentExpression');
    if (assignmentExpressions.length > 0) {
      return inferExpressionType(assignmentExpressions[assignmentExpressions.length - 1], context);
    }
  }

  if (['additiveExpression', 'multiplicativeExpression'].includes(nodeName)) {
    const operands = childNodes(node).filter((child) => child.kind === 'nonterminal');
    if (operands.length > 0) {
      // Single operand = pass-through: preserve null (void) result type.
      if (operands.length === 1) {
        return inferExpressionType(operands[0], context);
      }
      let combinedType = inferExpressionType(operands[0], context) || 'i32';
      for (let index = 1; index < operands.length; index += 1) {
        combinedType = selectCommonWatType(combinedType, inferExpressionType(operands[index], context) || combinedType);
      }
      return combinedType;
    }
  }

  if (['shiftExpression', 'andExpression', 'exclusiveOrExpression', 'inclusiveOrExpression'].includes(nodeName)) {
    const operands = childNodes(node).filter((child) => child.kind === 'nonterminal');
    if (operands.length > 0) {
      // Single operand = pass-through: preserve null (void) result type.
      if (operands.length === 1) {
        return inferExpressionType(operands[0], context);
      }
      return operands.some((operand) => inferExpressionType(operand, context) === 'i64') ? 'i64' : 'i32';
    }
  }

  if (['relationalExpression', 'equalityExpression', 'logicalAndExpression', 'logicalOrExpression'].includes(nodeName)) {
    const terminals = terminalChildren(node);
    if (terminals.length > 0) {
      return 'i32';
    }
  }

  const nestedChildren = nonterminalChildren(node);
  if (nestedChildren.length > 0) {
    return inferExpressionType(nestedChildren[0], context);
  }

  return null;
}

function normalizeTruthiness(instructions, valueType = 'i32') {
  const normalized = [...instructions];

  switch (valueType) {
    case 'i64':
      normalized.push('i64.eqz', 'i32.eqz');
      break;
    case 'f32':
      normalized.push('f32.const 0', 'f32.ne');
      break;
    case 'f64':
      normalized.push('f64.const 0', 'f64.ne');
      break;
    default:
      normalized.push('i32.eqz', 'i32.eqz');
      break;
  }

  return normalized;
}

function compileBooleanValue(node, context) {
  const nodeName = getNodeName(node);
  const directTokens = terminalChildren(node);

  if (nodeName === 'logicalOrExpression' && directTokens.some((token) => token.token === 'TOKEN__7C__7C_')) {
    return compileLogicalExpression(node, context, '||');
  }
  if (nodeName === 'logicalAndExpression' && directTokens.some((token) => token.token === 'TOKEN__26__26_')) {
    return compileLogicalExpression(node, context, '&&');
  }

  const valueType = inferExpressionType(node, context) || 'i32';
  const instructions = compileExpression(node, context, { keepValue: true });
  return normalizeTruthiness(instructions, valueType);
}

function compileLogicalExpression(node, context, operatorKind) {
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');
  const nestedChildren = nonterminalChildren(node);

  if (pieces.length === 0) {
    return [];
  }

  if (pieces.filter((piece) => piece.kind === 'terminal').length === 0 && nestedChildren.length > 0) {
    return compileExpression(nestedChildren[0], context, { keepValue: true });
  }

  let instructions = compileBooleanValue(pieces[0], context);

  for (let index = 1; index < pieces.length; index += 2) {
    const rightNode = pieces[index + 1];
    if (!rightNode) continue;

    if (operatorKind === '&&') {
      instructions = instructions.concat(
        'if (result i32)',
        ...compileBooleanValue(rightNode, context),
        'else',
        'i32.const 0',
        'end'
      );
    } else {
      instructions = instructions.concat(
        'if (result i32)',
        'i32.const 1',
        'else',
        ...compileBooleanValue(rightNode, context),
        'end'
      );
    }
  }

  return instructions;
}

function compileConditionalExpression(node, context, keepValue) {
  const questionMark = firstTerminal(node, 'TOKEN__3F_');
  if (!questionMark) {
    return compileFirstChild(node, context, keepValue);
  }

  const conditionNode = firstNonterminal(node, 'logicalOrExpression');
  const trueNode = firstNonterminal(node, 'expression');
  const conditionalChildren = nonterminalChildren(node, 'conditionalExpression');
  const falseNode = conditionalChildren[conditionalChildren.length - 1] || null;

  if (!conditionNode || !trueNode || !falseNode) {
    throw new CompilationError('Malformed ternary expression', getNodeName(node));
  }

  const trueType = inferExpressionType(trueNode, context) || 'i32';
  const falseType = inferExpressionType(falseNode, context) || 'i32';
  const resultType = selectCommonWatType(trueType, falseType);

  return [
    ...compileBooleanValue(conditionNode, context),
    `if (result ${resultType})`,
    ...coerceInstructionsToType(compileExpression(trueNode, context, { keepValue: true }), trueType, resultType, context),
    'else',
    ...coerceInstructionsToType(compileExpression(falseNode, context, { keepValue: true }), falseType, resultType, context),
    'end'
  ];
}

function compileExpression(node, context, options = {}) {
  const keepValue = options.keepValue !== false;

  if (!node) return [];

  if (node.kind === 'terminal') {
    return compileTerminalExpression(node, context, { keepValue });
  }

  const nodeName = getNodeName(node);

  switch (nodeName) {
    case 'initializer':
    case 'expression': {
      const expressions = nonterminalChildren(node);
      if (expressions.length === 0) return [];
      return compileExpression(expressions[expressions.length - 1], context, { keepValue });
    }

    case 'assignmentExpression':
      return compileAssignmentExpression(node, context, { keepValue });

    case 'conditionalExpression':
      return compileConditionalExpression(node, context, keepValue);

    case 'logicalOrExpression':
      return compileLogicalExpression(node, context, '||');

    case 'logicalAndExpression':
      return compileLogicalExpression(node, context, '&&');

    case 'inclusiveOrExpression':
      return compileBinaryExpression(node, context, {
        '|': 'i32.or'
      });

    case 'exclusiveOrExpression':
      return compileBinaryExpression(node, context, {
        '^': 'i32.xor'
      });

    case 'andExpression':
      return compileBinaryExpression(node, context, {
        '&': 'i32.and'
      });

    case 'equalityExpression':
      return compileTypedComparisonExpression(node, context, {
        '==': 'eq',
        '!=': 'ne'
      });

    case 'relationalExpression':
      return compileTypedComparisonExpression(node, context, {
        '<': 'lt',
        '<=': 'le',
        '>': 'gt',
        '>=': 'ge'
      });

    case 'shiftExpression':
      return compileBinaryExpression(node, context, {
        '<<': 'i32.shl',
        '>>': 'i32.shr_s'
      });

    case 'additiveExpression':
      return compileAdditiveExpression(node, context);

    case 'multiplicativeExpression':
      return compileTypedArithmeticExpression(node, context, {
        '*': 'mul',
        '/': 'div',
        '%': 'rem'
      });

    case 'castExpression':
      return compileCastExpression(node, context, keepValue);

    case 'constant':
    case 'primaryExpression':
      return compileFirstChild(node, context, keepValue);

    case 'unaryExpression':
      return compileUnaryExpression(node, context, keepValue);

    case 'postfixExpression':
      return compilePostfixExpression(node, context, keepValue);

    default: {
      const nestedChildren = nonterminalChildren(node);
      if (nestedChildren.length === 1 && terminalChildren(node).length === 0) {
        return compileExpression(nestedChildren[0], context, { keepValue });
      }
      throw new CompilationError(`Unsupported expression node: ${nodeName}`, nodeName);
    }
  }
}

function compileFirstChild(node, context, keepValue) {
  const nestedChildren = nonterminalChildren(node);
  if (nestedChildren.length === 0) {
    const terminal = firstTerminal(node);
    return terminal ? compileTerminalExpression(terminal, context, { keepValue }) : [];
  }
  return compileExpression(nestedChildren[0], context, { keepValue });
}

function compileCastExpression(node, context, keepValue) {
  const typeNameNode = firstNonterminal(node, 'typeName');
  if (!typeNameNode) {
    return compileFirstChild(node, context, keepValue);
  }

  const operandCandidates = nonterminalChildren(node).filter((child) => child !== typeNameNode);
  const operandNode = operandCandidates.length > 0 ? operandCandidates[operandCandidates.length - 1] : null;
  const targetTypeInfo = extractTypeInfoFromTypeName(typeNameNode);
  const operandInstructions = operandNode
    ? compileExpression(operandNode, context, { keepValue: true })
    : ['i32.const 0'];
  const inferredOperandType = inferExpressionType(operandNode, context);
  const lastInstruction = operandInstructions.length > 0 ? String(operandInstructions[operandInstructions.length - 1] || '') : '';
  const operandType = inferredOperandType
    || (/^f32\./.test(lastInstruction) ? 'f32' : null)
    || (/^f64\./.test(lastInstruction) ? 'f64' : null)
    || (/^i64\./.test(lastInstruction) ? 'i64' : null)
    || (/^i32\./.test(lastInstruction) ? 'i32' : null)
    || targetTypeInfo.watType
    || 'i32';

  return coerceInstructionsToType(operandInstructions, operandType, targetTypeInfo.watType || 'i32', context);
}

function compileUnaryExpression(node, context, keepValue) {
  const sizeofToken = firstTerminal(node, 'TOKEN_sizeof');
  if (sizeofToken) {
    const typeNameNode = firstNonterminal(node, 'typeName');
    if (typeNameNode) {
      return [`i32.const ${getSizeOfTypeNameNode(typeNameNode, context)}`];
    }

    const operandNode = nonterminalChildren(node).find((child) => !isNonterminal(child, 'unaryOperator'));
    return [`i32.const ${getSizeOfExpressionNode(operandNode, context)}`];
  }

  const directOperator = childNodes(node).find(
    (child) => child.kind === 'terminal' && ['TOKEN__2B__2B_', 'TOKEN__2D__2D_'].includes(child.token)
  );

  if (directOperator) {
    const operandNode = nonterminalChildren(node)[0];
    const targetName = extractIdentifierFromNode(operandNode);
    if (!targetName) {
      throw new CompilationError('Prefix increment/decrement requires a simple variable', getNodeName(node));
    }
    const delta = directOperator.token === 'TOKEN__2B__2B_' ? 1 : -1;
    return emitUpdateInstructions(targetName, delta, context, { prefix: true, keepValue });
  }

  const unaryOperatorNode = firstNonterminal(node, 'unaryOperator');
  if (unaryOperatorNode) {
    const operatorTerminal = firstTerminal(unaryOperatorNode);
    const operandNode = nonterminalChildren(node).find((child) => child !== unaryOperatorNode);
    const operandType = inferExpressionType(operandNode, context) || 'i32';

    if (!operatorTerminal) {
      throw new CompilationError('Malformed unary operator', getNodeName(node));
    }

    switch (operatorTerminal.token) {
      case 'TOKEN__2B_':
        return operandNode ? compileExpression(operandNode, context, { keepValue }) : [];
      case 'TOKEN__2D_':
        if (operandType === 'f64') {
          return [...compileExpression(operandNode, context, { keepValue: true }), 'f64.neg'];
        }
        if (operandType === 'f32') {
          return [...compileExpression(operandNode, context, { keepValue: true }), 'f32.neg'];
        }
        if (operandType === 'i64') {
          return ['i64.const 0', ...compileExpression(operandNode, context, { keepValue: true }), 'i64.sub'];
        }
        return ['i32.const 0', ...compileExpression(operandNode, context, { keepValue: true }), 'i32.sub'];
      case 'TOKEN__21_':
        return operandNode ? [...compileBooleanValue(operandNode, context), 'i32.eqz'] : ['i32.const 1'];
      case 'TOKEN__7E_':
        return operandNode
          ? [...compileExpression(operandNode, context, { keepValue: true }), 'i32.const -1', 'i32.xor']
          : [];
      case 'TOKEN__26_': {
        const lvalue = resolveLValue(operandNode, context);
        return lvalue.kind === 'symbol'
          ? emitAddressOfSymbol(lvalue.name, context)
          : lvalue.addressInstructions;
      }
      case 'TOKEN__2A_':
        return operandNode
          ? [
              ...compileExpression(operandNode, context, { keepValue: true }),
              getLoadOpcodeForType(inferPointerPointeeType(operandNode, context))
            ]
          : [];
      default:
        throw new CompilationError(`Unsupported unary operator '${operatorTerminal.value}'`, getNodeName(node));
    }
  }

  return compileFirstChild(node, context, keepValue);
}

function getSimpleIdentifierName(node) {
  if (!node) return null;

  if (node.kind === 'terminal') {
    if (node.token === 'Identifier' && !String(node.value).endsWith('++') && !String(node.value).endsWith('--')) {
      return node.value;
    }
    return null;
  }

  const nodeName = getNodeName(node);
  if (nodeName === 'primaryExpression') {
    const identifier = firstTerminal(node, 'Identifier');
    return identifier ? identifier.value : null;
  }

  if (nodeName === 'postfixExpression') {
    if (firstNonterminal(node, 'postfixSuffix')) {
      return null;
    }
    return getSimpleIdentifierName(firstNonterminal(node, 'primaryExpression'));
  }

  if (nodeName === 'unaryExpression') {
    const directOperator = childNodes(node).find(
      (child) => child.kind === 'terminal' && ['TOKEN__2B__2B_', 'TOKEN__2D__2D_'].includes(child.token)
    );
    if (directOperator || firstNonterminal(node, 'unaryOperator')) {
      return null;
    }
  }

  const nestedChildren = nonterminalChildren(node);
  if (nestedChildren.length === 1 && terminalChildren(node).length === 0) {
    return getSimpleIdentifierName(nestedChildren[0]);
  }

  return null;
}

function getIndexExpressionsFromPostfix(node) {
  if (!isNonterminal(node, 'postfixExpression')) {
    return [];
  }

  return nonterminalChildren(node, 'postfixSuffix')
    .filter((suffix) => !!firstTerminal(suffix, 'TOKEN__5B_'))
    .map((suffix) => firstNonterminal(suffix, 'expression'))
    .filter(Boolean);
}

function unwrapSingleNonterminalChain(node) {
  let current = node;
  while (current && current.kind === 'nonterminal') {
    const nested = nonterminalChildren(current);
    const terminals = terminalChildren(current);
    if (nested.length === 1 && terminals.length === 0) {
      current = nested[0];
      continue;
    }
    break;
  }
  return current;
}

function getDereferencedOperandFromPrimaryExpression(primaryExpression) {
  if (!isNonterminal(primaryExpression, 'primaryExpression')) {
    return null;
  }

  const parenthesizedExpr = firstNonterminal(primaryExpression, 'expression');
  if (!parenthesizedExpr) {
    return null;
  }

  const unwrapped = unwrapSingleNonterminalChain(parenthesizedExpr);
  if (!isNonterminal(unwrapped, 'unaryExpression')) {
    return null;
  }

  const unaryOperatorNode = firstNonterminal(unwrapped, 'unaryOperator');
  const operatorTerminal = unaryOperatorNode ? firstTerminal(unaryOperatorNode) : null;
  if (!operatorTerminal || operatorTerminal.token !== 'TOKEN__2A_') {
    return null;
  }

  return nonterminalChildren(unwrapped).find((child) => child !== unaryOperatorNode) || null;
}

function getPointerPointeeArrayDimensionsFromNode(pointerNode, context) {
  const identifierName = getSimpleIdentifierName(pointerNode);
  if (identifierName) {
    const symbol = resolveSymbol(identifierName, context);
    return symbol && Array.isArray(symbol.pointeeArrayDimensions)
      ? [...symbol.pointeeArrayDimensions]
      : [];
  }

  if (isNonterminal(pointerNode, 'postfixExpression')) {
    const primaryExpression = firstNonterminal(pointerNode, 'primaryExpression');
    const indexExpressions = getIndexExpressionsFromPostfix(pointerNode);
    const baseName = getSimpleIdentifierName(primaryExpression);

    if (baseName && indexExpressions.length > 0) {
      const symbol = resolveSymbol(baseName, context);
      return symbol && Array.isArray(symbol.pointeeArrayDimensions)
        ? [...symbol.pointeeArrayDimensions]
        : [];
    }
  }

  return [];
}

function getIndexedAccessInfoFromPointerValue(pointerNode, indexExpressions, context) {
  const indices = Array.isArray(indexExpressions) ? indexExpressions.filter(Boolean) : [indexExpressions].filter(Boolean);
  const watType = inferPointerPointeeType(pointerNode, context) || 'i32';
  let addressInstructions = compileExpression(pointerNode, context, { keepValue: true });
  let pointerPointeeDimensions = getPointerPointeeArrayDimensionsFromNode(pointerNode, context).slice(1);
  let resultObjectDimensions = [];

  for (const indexExpression of indices) {
    const stride = getStrideForAccess(watType, pointerPointeeDimensions);
    addressInstructions = addressInstructions.concat(
      compileExpression(indexExpression, context, { keepValue: true }),
      `i32.const ${stride}`,
      'i32.mul',
      'i32.add'
    );
    resultObjectDimensions = [...pointerPointeeDimensions];
    pointerPointeeDimensions = pointerPointeeDimensions.length > 0
      ? pointerPointeeDimensions.slice(1)
      : [];
  }

  return {
    symbol: null,
    watType,
    addressInstructions,
    resultObjectDimensions,
    resultIsAddress: resultObjectDimensions.length > 0
  };
}

function getIndexedAccessInfoFromPostfix(node, context) {
  if (!isNonterminal(node, 'postfixExpression')) {
    return null;
  }

  const primaryExpression = firstNonterminal(node, 'primaryExpression');
  const indexExpressions = getIndexExpressionsFromPostfix(node);
  if (indexExpressions.length === 0) {
    return null;
  }

  const baseName = getSimpleIdentifierName(primaryExpression);
  if (baseName) {
    return getIndexedAccessInfo(baseName, indexExpressions, context);
  }

  const derefOperand = getDereferencedOperandFromPrimaryExpression(primaryExpression);
  if (derefOperand) {
    return getIndexedAccessInfoFromPointerValue(derefOperand, indexExpressions, context);
  }

  return null;
}

function getMemberAccessPathFromPostfix(node) {
  if (!isNonterminal(node, 'postfixExpression')) {
    return [];
  }

  const suffixes = nonterminalChildren(node, 'postfixSuffix');
  const accessPath = [];

  let lastIndexSuffixIndex = -1;
  for (let i = suffixes.length - 1; i >= 0; i--) {
    if (firstTerminal(suffixes[i], 'TOKEN__5B_')) {
      lastIndexSuffixIndex = i;
      break;
    }
  }

  const startIndex = lastIndexSuffixIndex >= 0 ? lastIndexSuffixIndex + 1 : 0;

  for (let i = startIndex; i < suffixes.length; i++) {
    const suffix = suffixes[i];

    const fieldIdentifier = firstTerminal(suffix, 'Identifier');
    if (firstTerminal(suffix, 'TOKEN__2E_') && fieldIdentifier) {
      accessPath.push({ isArrow: false, fieldName: fieldIdentifier.value });
      continue;
    }

    if (firstTerminal(suffix, 'TOKEN__2D__3E_') && fieldIdentifier) {
      accessPath.push({ isArrow: true, fieldName: fieldIdentifier.value });
      continue;
    }

    if (accessPath.length === 0 && !firstTerminal(suffix, 'TOKEN__2E_') && !firstTerminal(suffix, 'TOKEN__2D__3E_')) {
      break;
    }
  }

  return accessPath;
}

function resolvePostfixMemberAccess(baseName, memberAccessPath, context) {
  if (!baseName || !Array.isArray(memberAccessPath) || memberAccessPath.length === 0) {
    return null;
  }

  const baseSymbol = resolveDirectSymbol(baseName, context);
  if (!baseSymbol) {
    throw new CompilationError(`Unknown base symbol '${baseName}'`, context.function.sourceName);
  }

  let addressInstructions = null;
  let structLayout = null;
  let currentField = null;

  if (memberAccessPath[0].isArrow) {
    if ((baseSymbol.pointerDepth || 0) <= 0) {
      throw new CompilationError(`'${baseName}' is not a pointer-to-struct value`, context.function.sourceName);
    }
    structLayout = resolveStructLayout(baseSymbol.structName, context.module, baseSymbol.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct layout for pointer '${baseName}'`, context.function.sourceName);
    }
    addressInstructions = compileExpression(
      { kind: 'terminal', token: 'Identifier', value: baseName },
      context,
      { keepValue: true }
    );
  } else {
    if (baseSymbol.stackOffset == null) {
      throw new CompilationError(
        `Struct member access is currently supported only for frame-backed locals and parameters ('${baseName}')`,
        context.function.sourceName
      );
    }
    structLayout = resolveStructLayout(baseSymbol.structName, context.module, baseSymbol.structLayout || null);
    if (!structLayout) {
      throw new CompilationError(`Unknown struct layout for '${baseName}'`, context.function.sourceName);
    }
    addressInstructions = emitAddressOfSymbol(baseName, context);
  }

  for (let index = 0; index < memberAccessPath.length; index += 1) {
    const step = memberAccessPath[index];

    if (index > 0 && step.isArrow) {
      if (!currentField || (currentField.pointerDepth || 0) <= 0) {
        throw new CompilationError(`Field '${currentField ? currentField.sourceName : '?'}' is not a pointer and cannot use '->'`, context.function.sourceName);
      }
      addressInstructions = addressInstructions.concat(getLoadOpcodeForType(currentField.watType || 'i32'));
      structLayout = resolveStructLayout(currentField.structName, context.module, currentField.structLayout || null);
      if (!structLayout) {
        throw new CompilationError(`Unknown pointed struct layout for field '${currentField.sourceName}'`, context.function.sourceName);
      }
    }

    currentField = structLayout.fieldsByName.get(step.fieldName);
    if (!currentField) {
      throw new CompilationError(`Unknown struct field '${step.fieldName}' on '${baseName}'`, context.function.sourceName);
    }

    addressInstructions = addressInstructions.concat(`i32.const ${currentField.offset}`, 'i32.add');

    const nextStep = memberAccessPath[index + 1] || null;
    if (nextStep && !nextStep.isArrow) {
      if (!currentField.isStruct) {
        throw new CompilationError(`Field '${currentField.sourceName}' is not a nested struct`, context.function.sourceName);
      }
      structLayout = resolveStructLayout(currentField.structName, context.module, currentField.structLayout || null);
      if (!structLayout) {
        throw new CompilationError(`Unknown nested struct layout for field '${currentField.sourceName}'`, context.function.sourceName);
      }
    }
  }

  return {
    baseSymbol,
    field: currentField,
    addressInstructions,
    watType: currentField ? (currentField.watType || currentField.baseWatType || 'i32') : (baseSymbol.watType || 'i32'),
    pointerDepth: currentField ? (currentField.pointerDepth || 0) : 0,
    isArray: !!(currentField && (currentField.isArray || currentField.declaredAsArray)),
    arrayDimensions: currentField ? getSymbolArrayDimensions(currentField) : [],
    isStruct: !!(currentField && currentField.isStruct),
    structLayout: currentField && currentField.isStruct
      ? resolveStructLayout(currentField.structName, context.module, currentField.structLayout || null)
      : null
  };
}

/**
 * Compile member access when base address is already on stack.
 * Used for cases like ptrs[0]->field where [0] produces an address,
 * and then we need to apply ->field to that address.
 * Returns instructions that result in either an address (if final field is struct)
 * or a loaded value (if final field is not struct).
 */
function compileMemberAccessFromAddress(memberAccessPath, baseAccessInfo, context) {
  if (!memberAccessPath || memberAccessPath.length === 0) {
    return [];
  }

  let instructions = [];
  let currentStructLayout = null;
  let lastFieldIsStruct = false;
  let lastFieldType = null;

  // Get the struct layout from the symbol returned by getIndexedAccessInfo
  if (baseAccessInfo && baseAccessInfo.symbol) {
    const symbol = baseAccessInfo.symbol;
    
    // For array of pointers like 'struct Node *ptrs[2]'
    // after indexing, baseAccessInfo.watType is 'i32' (the element type, which is a pointer)
    // The symbol's structName points to the struct that the pointer targets
    // (because pointerDepth > 0 means it's a pointer-to-struct)
    
    if (symbol.structName) {
      // The symbol directly tells us about the struct type
      currentStructLayout = resolveStructLayout(symbol.structName, context.module);
    } else if (symbol.structLayout) {
      currentStructLayout = symbol.structLayout;
    }
  }

  for (let i = 0; i < memberAccessPath.length; i++) {
    const accessStep = memberAccessPath[i];
    
    if (!currentStructLayout) {
      throw new CompilationError(
        `Cannot apply member access to non-struct type`,
        'member-access'
      );
    }

    const field = currentStructLayout.fieldsByName.get(accessStep.fieldName);
    if (!field) {
      throw new CompilationError(
        `Unknown struct field '${accessStep.fieldName}' in struct`,
        'member-access'
      );
    }

    // For arrow access: the address on stack points to a pointer that we need to dereference
    if (accessStep.isArrow) {
      // Address on stack points to storage containing a pointer value
      // The pointer itself is at offset 0 (we're directly on it after indexing)
      
      // Load the pointer value (i32) from the current address
      instructions.push('i32.load');
      
      // Now add the offset of the field in the struct being pointed to
      if (field.offset > 0) {
        instructions.push(`i32.const ${field.offset}`);
        instructions.push('i32.add');
      }
      
      // Track if this field is a struct (for final result determination)
      lastFieldIsStruct = field.isStruct || false;
      lastFieldType = field.watType;
      
      // The pointer now points to the struct, update layout for next step
      if (field.structName) {
        currentStructLayout = resolveStructLayout(field.structName, context.module);
      } else {
        currentStructLayout = null;
      }
    } else {
      // Dot access: add offset and optionally load if it's the last step
      if (field.offset > 0) {
        instructions.push(`i32.const ${field.offset}`);
        instructions.push('i32.add');
      }
      
      // Track if this field is a struct
      lastFieldIsStruct = field.isStruct || false;
      lastFieldType = field.watType;
      
      // Update layout for potential next steps
      if (i < memberAccessPath.length - 1) {
        if (field.structName) {
          currentStructLayout = resolveStructLayout(field.structName, context.module);
        }
      }
    }
  }

  // If the final field is not a struct, we need to load its value
  // (If it is a struct, we return just the address per C semantics)
  if (!lastFieldIsStruct && memberAccessPath.length > 0) {
    instructions.push(getLoadOpcodeForType(lastFieldType || 'i32'));
  }

  return instructions;
}

function getDecayDimensionsForSymbol(symbol) {
  const dimensions = getSymbolArrayDimensions(symbol);
  if (symbol && (symbol.isArray || symbol.declaredAsArray)) {
    return dimensions.slice(1);
  }
  return [];
}

function getStrideForAccess(baseWatType, pointeeDimensions = []) {
  return getTypeSize(baseWatType || 'i32') * getDimensionProduct(pointeeDimensions);
}

function getIndexedAccessInfo(name, indexExpressions, context) {
  const symbol = resolveSymbol(name, context);
  if (!symbol) {
    throw new CompilationError(`Unknown indexed symbol '${name}'`, context.function.sourceName);
  }

  const indices = Array.isArray(indexExpressions) ? indexExpressions.filter(Boolean) : [indexExpressions].filter(Boolean);
  // For an array of pointers (e.g. char *items[]) the elements are i32 addresses,
  // not the base char type. For a direct char array (e.g. char str[]) the elements
  // are 1-byte chars (i8). For a char* param used with ptr[n], isArray is false and
  // baseWatType='i8' correctly drives stride-1 / load8_u indexing.
  const rawBaseType = symbol.baseWatType || symbol.watType || 'i32';
  const watType = (symbol.isArray && (symbol.pointerDepth || 0) > 0) ? 'i32' : rawBaseType;
  let addressInstructions = symbol.isArray
    ? emitAddressOfSymbol(name, context)
    : compileExpression({ kind: 'terminal', token: 'Identifier', value: name }, context, { keepValue: true });
  let pointerPointeeDimensions = getDecayDimensionsForSymbol(symbol);
  let resultObjectDimensions = [];

  for (const indexExpression of indices) {
    const stride = getStrideForAccess(watType, pointerPointeeDimensions);
    addressInstructions = addressInstructions.concat(
      compileExpression(indexExpression, context, { keepValue: true }),
      `i32.const ${stride}`,
      'i32.mul',
      'i32.add'
    );
    resultObjectDimensions = [...pointerPointeeDimensions];
    pointerPointeeDimensions = pointerPointeeDimensions.length > 0
      ? pointerPointeeDimensions.slice(1)
      : [];
  }

  return {
    symbol,
    watType,
    addressInstructions,
    resultObjectDimensions,
    resultIsAddress: resultObjectDimensions.length > 0
  };
}

function inferPointerPointeeType(node, context) {
  if (isNonterminal(node, 'castExpression')) {
    const typeNameNode = firstNonterminal(node, 'typeName');
    if (typeNameNode) {
      const castType = extractTypeInfoFromTypeName(typeNameNode);
      if ((castType.pointerDepth || 0) > 0) {
        return castType.baseWatType || 'i32';
      }
    }
  }

  if (isNonterminal(node, 'postfixExpression')) {
    const primaryExpression = firstNonterminal(node, 'primaryExpression');
    const indexExpressions = getIndexExpressionsFromPostfix(node);
    const baseName = getSimpleIdentifierName(primaryExpression);

    if (baseName && indexExpressions.length > 0) {
      const accessInfo = getIndexedAccessInfo(baseName, indexExpressions, context);
      return accessInfo.watType || 'i32';
    }
  }

  const identifierName = getSimpleIdentifierName(node) || extractIdentifierFromNode(node);
  const symbol = identifierName ? resolveSymbol(identifierName, context) : null;

  if (!symbol) {
    return 'i32';
  }

  if ((symbol.pointerDepth || 0) > 1) {
    return 'i32';
  }

  return symbol.baseWatType || symbol.watType || 'i32';
}

function resolveLValue(node, context) {
  if (isNonterminal(node, 'postfixExpression')) {
    const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
    if (accessInfo) {
      if (accessInfo.resultIsAddress) {
        throw new CompilationError('Assignment to a subarray is not supported right now', getNodeName(node));
      }
      return {
        kind: 'indirect',
        addressInstructions: accessInfo.addressInstructions,
        watType: accessInfo.watType
      };
    }

    const primaryExpression = firstNonterminal(node, 'primaryExpression');
    const memberAccessPath = getMemberAccessPathFromPostfix(node);
    const baseName = getSimpleIdentifierName(primaryExpression);
    if (baseName && memberAccessPath.length > 0) {
      const memberAccess = resolvePostfixMemberAccess(baseName, memberAccessPath, context);
      if (!memberAccess) {
        throw new CompilationError(`Unknown assignment target '${baseName}'`, context.function.sourceName);
      }
      if (memberAccess.isStruct) {
        throw new CompilationError('Assignment to a whole struct field object is not supported right now', context.function.sourceName);
      }
      return {
        kind: 'indirect',
        addressInstructions: memberAccess.addressInstructions,
        watType: memberAccess.watType
      };
    }
  }

  const simpleIdentifier = getSimpleIdentifierName(node);
  if (simpleIdentifier) {
    if (String(simpleIdentifier).includes('.')) {
      const memberAccess = resolveMemberAccess(simpleIdentifier, context);
      if (!memberAccess) {
        throw new CompilationError(`Unknown assignment target '${simpleIdentifier}'`, context.function.sourceName);
      }
      if (memberAccess.isStruct) {
        throw new CompilationError('Assignment to a whole struct field object is not supported right now', context.function.sourceName);
      }
      return {
        kind: 'indirect',
        addressInstructions: memberAccess.addressInstructions,
        watType: memberAccess.watType
      };
    }

    const symbol = resolveSymbol(simpleIdentifier, context);
    if (!symbol) {
      throw new CompilationError(`Unknown assignment target '${simpleIdentifier}'`, context.function.sourceName);
    }
    return {
      kind: 'symbol',
      name: simpleIdentifier,
      watType: symbol.watType || 'i32'
    };
  }

  if (isNonterminal(node, 'unaryExpression')) {
    const unaryOperatorNode = firstNonterminal(node, 'unaryOperator');
    const operatorTerminal = unaryOperatorNode ? firstTerminal(unaryOperatorNode) : null;
    const operandNode = nonterminalChildren(node).find((child) => child !== unaryOperatorNode);

    if (operatorTerminal && operatorTerminal.token === 'TOKEN__2A_') {
      return {
        kind: 'indirect',
        addressInstructions: compileExpression(operandNode, context, { keepValue: true }),
        watType: inferPointerPointeeType(operandNode, context)
      };
    }
  }

  const nestedChildren = nonterminalChildren(node);
  if (nestedChildren.length === 1 && terminalChildren(node).length === 0) {
    return resolveLValue(nestedChildren[0], context);
  }

  throw new CompilationError('Unsupported assignment target', getNodeName(node));
}

function getCompoundAssignmentOpcode(operatorValue, watType = 'i32') {
  const effectiveType = toWatType(watType || 'i32');

  switch (operatorValue) {
    case '+=': return getTypedArithmeticOpcode('add', effectiveType);
    case '-=': return getTypedArithmeticOpcode('sub', effectiveType);
    case '*=': return getTypedArithmeticOpcode('mul', effectiveType);
    case '/=': return getTypedArithmeticOpcode('div', effectiveType);
    case '%=': return getTypedArithmeticOpcode('rem', effectiveType);
    case '<<=': return effectiveType === 'i64' ? 'i64.shl' : 'i32.shl';
    case '>>=': return effectiveType === 'i64' ? 'i64.shr_s' : 'i32.shr_s';
    case '&=': return effectiveType === 'i64' ? 'i64.and' : 'i32.and';
    case '^=': return effectiveType === 'i64' ? 'i64.xor' : 'i32.xor';
    case '|=': return effectiveType === 'i64' ? 'i64.or' : 'i32.or';
    default: return null;
  }
}

function normalizeInstructionArray(instructions) {
  if (Array.isArray(instructions)) {
    return instructions;
  }
  return instructions ? [instructions] : [];
}

function compileAssignmentExpression(node, context, options = {}) {
  const keepValue = options.keepValue !== false;
  const nestedChildren = nonterminalChildren(node);
  const assignmentOperator = firstNonterminal(node, 'assignmentOperator');

  if (!assignmentOperator || nestedChildren.length < 3) {
    return nestedChildren.length > 0
      ? compileExpression(nestedChildren[0], context, { keepValue })
      : [];
  }

  const leftNode = nestedChildren[0];
  const rightNode = nestedChildren[nestedChildren.length - 1];
  const lvalue = resolveLValue(leftNode, context);
  const lvalueType = lvalue.watType || 'i32';
  const rhsType = inferExpressionType(rightNode, context) || lvalueType;
  const operatorTerminal = firstTerminal(assignmentOperator);
  const operatorValue = operatorTerminal ? operatorTerminal.value : '=';

  let rhsInstructions = coerceInstructionsToType(
    compileExpression(rightNode, context, { keepValue: true }),
    rhsType,
    lvalueType,
    context
  );

  if (operatorValue !== '=') {
    const currentValueInstructions = lvalue.kind === 'symbol'
      ? normalizeInstructionArray(emitLoadInstruction(lvalue.name, context))
      : [...lvalue.addressInstructions, getLoadOpcodeForType(lvalueType)];
    const compoundOpcode = getCompoundAssignmentOpcode(operatorValue, lvalueType);

    if (!compoundOpcode) {
      throw new CompilationError(`Unsupported assignment operator '${operatorValue}'`, getNodeName(node));
    }

    rhsInstructions = currentValueInstructions.concat(rhsInstructions, compoundOpcode);
  }

  if (lvalue.kind === 'symbol') {
    return emitStoreInstructions(lvalue.name, rhsInstructions, context, keepValue);
  }

  return emitStoreToAddress(lvalue.addressInstructions, rhsInstructions, lvalueType, context, keepValue);
}

function isPointerLikeNode(node, context) {
  const unwrapped = unwrapSingleNonterminalChain(node);
  if (unwrapped && unwrapped !== node) {
    return isPointerLikeNode(unwrapped, context);
  }

  const type = inferExpressionType(node, context);
  if (type !== 'i32') {
    return false;
  }

  const simpleIdentifier = getSimpleIdentifierName(node);
  if (simpleIdentifier) {
    const symbol = resolveSymbol(simpleIdentifier, context);
    return !!symbol && ((symbol.pointerDepth || 0) > 0 || symbol.isArray || symbol.declaredAsArray);
  }

  if (isNonterminal(node, 'postfixExpression')) {
    const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
    if (accessInfo) {
      return accessInfo.resultIsAddress;
    }

    const primaryExpression = firstNonterminal(node, 'primaryExpression');
    const memberAccessPath = getMemberAccessPathFromPostfix(node);
    const baseName = getSimpleIdentifierName(primaryExpression);
    if (baseName && memberAccessPath.length > 0) {
      const memberAccess = resolvePostfixMemberAccess(baseName, memberAccessPath, context);
      return !!memberAccess && (memberAccess.isStruct || memberAccess.isArray || memberAccess.pointerDepth > 0);
    }
  }

  if (isNonterminal(node, 'unaryExpression')) {
    const unaryOperatorNode = firstNonterminal(node, 'unaryOperator');
    const operatorTerminal = unaryOperatorNode ? firstTerminal(unaryOperatorNode) : null;
    return !!operatorTerminal && operatorTerminal.token === 'TOKEN__26_';
  }

  return false;
}

function getPointerElementSize(node, context) {
  const unwrapped = unwrapSingleNonterminalChain(node);
  if (unwrapped && unwrapped !== node) {
    return getPointerElementSize(unwrapped, context);
  }

  const simpleIdentifier = getSimpleIdentifierName(node);
  if (simpleIdentifier) {
    const symbol = resolveSymbol(simpleIdentifier, context);
    if (symbol) {
      return getStrideForAccess(symbol.baseWatType || symbol.watType || 'i32', getDecayDimensionsForSymbol(symbol));
    }
  }

  if (isNonterminal(node, 'postfixExpression')) {
    const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
    if (accessInfo) {
      return getStrideForAccess(accessInfo.watType, accessInfo.resultObjectDimensions.slice(1));
    }

    const primaryExpression = firstNonterminal(node, 'primaryExpression');
    const memberAccessPath = getMemberAccessPathFromPostfix(node);
    const baseName = getSimpleIdentifierName(primaryExpression);
    if (baseName && memberAccessPath.length > 0) {
      const memberAccess = resolvePostfixMemberAccess(baseName, memberAccessPath, context);
      if (memberAccess) {
        if (memberAccess.isArray) {
          const dims = Array.isArray(memberAccess.arrayDimensions) ? memberAccess.arrayDimensions.slice(1) : [];
          return getStrideForAccess(memberAccess.watType || 'i32', dims);
        }
        if (memberAccess.pointerDepth > 0) {
          return getTypeSize(memberAccess.watType || 'i32');
        }
      }
    }
  }

  return getTypeSize(inferPointerPointeeType(node, context) || 'i32');
}

function compileAdditiveExpression(node, context) {
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');
  const terminals = pieces.filter((piece) => piece.kind === 'terminal');

  if (terminals.length === 0) {
    const nestedChildren = nonterminalChildren(node);
    return nestedChildren.length > 0 ? compileExpression(nestedChildren[0], context, { keepValue: true }) : [];
  }

  let currentType = toWatType(inferExpressionType(pieces[0], context) || 'i32');
  let instructions = coerceInstructionsToType(
    compileExpression(pieces[0], context, { keepValue: true }),
    currentType,
    currentType,
    context
  );
  let currentIsPointer = isPointerLikeNode(pieces[0], context);
  let currentElementSize = currentIsPointer
    ? getPointerElementSize(pieces[0], context)
    : getTypeSize(inferExpressionType(pieces[0], context) || 'i32');

  for (let index = 1; index < pieces.length; index += 2) {
    const operatorNode = pieces[index];
    const rightNode = pieces[index + 1];

    if (!operatorNode || operatorNode.kind !== 'terminal' || !rightNode) {
      continue;
    }

    const operator = operatorNode.value;
    const rightType = toWatType(inferExpressionType(rightNode, context) || 'i32');
    const rightInstructions = coerceInstructionsToType(
      compileExpression(rightNode, context, { keepValue: true }),
      rightType,
      rightType,
      context
    );
    const rightIsPointer = isPointerLikeNode(rightNode, context);

    if (currentIsPointer || rightIsPointer) {
      if (currentIsPointer && rightIsPointer) {
        // Pointer-to-pointer subtraction: (p1 - p2) / element_size
        if (operator === '-') {
          const rightElementSize = getPointerElementSize(rightNode, context);
          // Both pointers should have the same element size for meaningful arithmetic
          if (currentElementSize !== rightElementSize) {
            // Still allow it, just warn conceptually - WAT will do raw address subtraction
          }
          const coercedRight = coerceInstructionsToType(rightInstructions, rightType, 'i32');
          instructions = instructions.concat(
            coercedRight,
            'i32.sub',
            `i32.const ${currentElementSize}`,
            'i32.div_s'
          );
          currentIsPointer = false;
          currentType = 'i32';
          continue;
        } else {
          throw new CompilationError('Pointer-to-pointer addition is not supported', getNodeName(node));
        }
      }

      if (currentIsPointer) {
        const coercedRight = coerceInstructionsToType(rightInstructions, rightType, 'i32');
        instructions = instructions.concat(
          coercedRight,
          `i32.const ${currentElementSize}`,
          'i32.mul',
          operator === '-' ? 'i32.sub' : 'i32.add'
        );
      } else {
        if (operator === '-') {
          throw new CompilationError('Integer minus pointer is not supported yet', getNodeName(node));
        }

        const coercedLeft = coerceInstructionsToType(instructions, currentType, 'i32');
        currentElementSize = getPointerElementSize(rightNode, context);
        instructions = [
          ...rightInstructions,
          ...coercedLeft,
          `i32.const ${currentElementSize}`,
          'i32.mul',
          'i32.add'
        ];
      }

      currentIsPointer = true;
      currentType = 'i32';
      continue;
    }

    const commonType = selectCommonWatType(currentType, rightType);
    const typePrefix = commonType === 'i64' ? 'i64' : commonType;
    const opcode = operator === '+' ? `${typePrefix}.add` : `${typePrefix}.sub`;
    instructions = coerceInstructionsToType(instructions, currentType, commonType, context)
      .concat(coerceInstructionsToType(rightInstructions, rightType, commonType, context), opcode);
    currentType = commonType;
    currentElementSize = getTypeSize(rightType);
  }

  return instructions;
}

function getTypedComparisonOpcode(baseOperator, watType = 'i32') {
  const effectiveType = toWatType(watType || 'i32');
  if (effectiveType === 'i64') {
    return `i64.${baseOperator}_s`;
  }
  if (effectiveType === 'f32' || effectiveType === 'f64') {
    return `${effectiveType}.${baseOperator}`;
  }
  if (baseOperator === 'eq' || baseOperator === 'ne') {
    return `i32.${baseOperator}`;
  }
  return `i32.${baseOperator}_s`;
}

function getTypedArithmeticOpcode(baseOperator, watType = 'i32') {
  const effectiveType = toWatType(watType || 'i32');
  if (baseOperator === 'rem') {
    if (effectiveType === 'i64') return 'i64.rem_s';
    if (effectiveType === 'i32') return 'i32.rem_s';
    throw new CompilationError('Modulo is only supported for integer operands');
  }

  if (baseOperator === 'div') {
    if (effectiveType === 'i64') return 'i64.div_s';
    if (effectiveType === 'i32') return 'i32.div_s';
    return `${effectiveType}.div`;
  }

  if (baseOperator === 'mul' || baseOperator === 'add' || baseOperator === 'sub') {
    return `${effectiveType}.${baseOperator}`;
  }

  throw new CompilationError(`Unsupported arithmetic operator '${baseOperator}'`);
}

function compileTypedComparisonExpression(node, context, operatorMap) {
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');
  const terminals = pieces.filter((piece) => piece.kind === 'terminal');

  if (terminals.length === 0) {
    const nestedChildren = nonterminalChildren(node);
    return nestedChildren.length > 0 ? compileExpression(nestedChildren[0], context, { keepValue: true }) : [];
  }

  let currentType = toWatType(inferExpressionType(pieces[0], context) || 'i32');
  let instructions = compileExpression(pieces[0], context, { keepValue: true });

  for (let index = 1; index < pieces.length; index += 2) {
    const operatorNode = pieces[index];
    const rightNode = pieces[index + 1];

    if (!operatorNode || operatorNode.kind !== 'terminal' || !rightNode) {
      continue;
    }

    const baseOperator = operatorMap[operatorNode.value];
    if (!baseOperator) {
      throw new CompilationError(`Unsupported operator '${operatorNode.value}'`, getNodeName(node));
    }

    const rightType = toWatType(inferExpressionType(rightNode, context) || 'i32');
    const commonType = selectCommonWatType(currentType, rightType);
    const rightInstructions = compileExpression(rightNode, context, { keepValue: true });

    instructions = coerceInstructionsToType(instructions, currentType, commonType, context).concat(
      coerceInstructionsToType(rightInstructions, rightType, commonType, context),
      getTypedComparisonOpcode(baseOperator, commonType)
    );

    currentType = 'i32';
  }

  return instructions;
}

function compileTypedArithmeticExpression(node, context, operatorMap) {
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');
  const terminals = pieces.filter((piece) => piece.kind === 'terminal');

  if (terminals.length === 0) {
    const nestedChildren = nonterminalChildren(node);
    return nestedChildren.length > 0 ? compileExpression(nestedChildren[0], context, { keepValue: true }) : [];
  }

  let currentType = toWatType(inferExpressionType(pieces[0], context) || 'i32');
  let instructions = compileExpression(pieces[0], context, { keepValue: true });

  for (let index = 1; index < pieces.length; index += 2) {
    const operatorNode = pieces[index];
    const rightNode = pieces[index + 1];

    if (!operatorNode || operatorNode.kind !== 'terminal' || !rightNode) {
      continue;
    }

    const baseOperator = operatorMap[operatorNode.value];
    if (!baseOperator) {
      throw new CompilationError(`Unsupported operator '${operatorNode.value}'`, getNodeName(node));
    }

    const rightType = toWatType(inferExpressionType(rightNode, context) || 'i32');
    const commonType = selectCommonWatType(currentType, rightType);
    const rightInstructions = compileExpression(rightNode, context, { keepValue: true });

    instructions = coerceInstructionsToType(instructions, currentType, commonType, context).concat(
      coerceInstructionsToType(rightInstructions, rightType, commonType, context),
      getTypedArithmeticOpcode(baseOperator, commonType)
    );

    currentType = commonType;
  }

  return instructions;
}

function compileBinaryExpression(node, context, operatorMap) {
  const pieces = childNodes(node).filter((child) => child.kind === 'nonterminal' || child.kind === 'terminal');
  const terminals = pieces.filter((piece) => piece.kind === 'terminal');

  if (terminals.length === 0) {
    const nestedChildren = nonterminalChildren(node);
    return nestedChildren.length > 0 ? compileExpression(nestedChildren[0], context, { keepValue: true }) : [];
  }

  let instructions = compileExpression(pieces[0], context, { keepValue: true });

  for (let index = 1; index < pieces.length; index += 2) {
    const operatorNode = pieces[index];
    const rightNode = pieces[index + 1];

    if (!operatorNode || operatorNode.kind !== 'terminal' || !rightNode) {
      continue;
    }

    const opcode = operatorMap[operatorNode.value];
    if (!opcode) {
      throw new CompilationError(`Unsupported operator '${operatorNode.value}'`, getNodeName(node));
    }

    instructions = instructions.concat(
      compileExpression(rightNode, context, { keepValue: true }),
      opcode
    );
  }

  return instructions;
}

function compileTerminalExpression(node, context, options = {}) {
  const keepValue = options.keepValue !== false;

  if (node.token === 'IntegerConstant') {
    return [`i32.const ${parseCIntegerLiteral(node.value)}`];
  }

  if (node.token === 'CharacterConstant') {
    return [`i32.const ${parseCCharacterLiteral(node.value)}`];
  }

  if (node.token === 'StringLiteral') {
    return emitStringLiteralAddress(node.value, context);
  }

  if (node.token === 'FloatingConstant') {
    const numericValue = parseCFloatingLiteral(node.value);
    const isF32 = /[fF]$/.test(String(node.value || '').trim());
    return [isF32 ? `f32.const ${numericValue}` : `f64.const ${numericValue}`];
  }

  if (node.token === 'Identifier') {
    if (typeof node.value === 'string' && (node.value.endsWith('++') || node.value.endsWith('--'))) {
      const delta = node.value.endsWith('++') ? 1 : -1;
      const baseName = node.value.slice(0, -2);
      return emitUpdateInstructions(baseName, delta, context, { prefix: false, keepValue });
    }
    const loadInstructions = emitLoadInstruction(node.value, context);
    return Array.isArray(loadInstructions) ? loadInstructions : [loadInstructions];
  }

  return [];
}

function compilePostfixExpression(node, context, keepValue) {
  const primaryExpression = firstNonterminal(node, 'primaryExpression');
  const postfixSuffixes = nonterminalChildren(node, 'postfixSuffix');

  if (postfixSuffixes.length === 0) {
    return primaryExpression ? compileExpression(primaryExpression, context, { keepValue }) : [];
  }

  // Check for member access path (.field or ->field)
  const memberAccessPath = getMemberAccessPathFromPostfix(node);
  
  // Handle indexing followed by possible member access
  const accessInfo = getIndexedAccessInfoFromPostfix(node, context);
  if (accessInfo) {
    let instructions = [...accessInfo.addressInstructions];
    
    // If we have member access after indexing, handle it
    if (memberAccessPath.length > 0) {
      // After indexing, we have an address on the stack pointing to an element
      // Now apply member access to that address
      instructions = instructions.concat(
        compileMemberAccessFromAddress(memberAccessPath, accessInfo, context)
      );
      
      if (!keepValue) {
        instructions.push('drop');
      }
      return instructions;
    }
    
    // No member access, just return indexed access result
    if (accessInfo.resultIsAddress) {
      return instructions;
    }

    return [
      ...instructions,
      getLoadOpcodeForType(accessInfo.watType)
    ];
  }

  const indexExpressions = getIndexExpressionsFromPostfix(node);
  if (indexExpressions.length > 0) {
    throw new CompilationError('Only simple array/pointer indexing is supported right now', getNodeName(node));
  }

  // Direct member access (no indexing) on primary expression
  if (memberAccessPath.length > 0) {
    const baseName = getSimpleIdentifierName(primaryExpression);
    if (baseName) {
      const memberAccess = resolvePostfixMemberAccess(baseName, memberAccessPath, context);
      if (memberAccess) {
        if (!keepValue) {
          return memberAccess.addressInstructions.concat('drop');
        }
        if (memberAccess.isStruct || memberAccess.isArray) {
          return memberAccess.addressInstructions;
        }
        return memberAccess.addressInstructions.concat(getLoadOpcodeForType(memberAccess.watType || 'i32'));
      }
    }
  }

  const postfixOperator = postfixSuffixes
    .flatMap((suffix) => childNodes(suffix))
    .find((child) => child.kind === 'terminal' && ['TOKEN__2B__2B_', 'TOKEN__2D__2D_'].includes(child.token));

  if (postfixOperator) {
    const targetName = extractIdentifierFromNode(primaryExpression);
    if (!targetName) {
      throw new CompilationError('Postfix increment/decrement requires a simple variable', getNodeName(node));
    }
    const delta = postfixOperator.token === 'TOKEN__2B__2B_' ? 1 : -1;
    return emitUpdateInstructions(targetName, delta, context, { prefix: false, keepValue });
  }

  const calleeName = extractIdentifierFromNode(primaryExpression);
  if (!calleeName) {
    throw new CompilationError('Only named function calls are supported right now', getNodeName(node));
  }

  const callSuffix = postfixSuffixes.find((suffix) => !!firstTerminal(suffix, 'TOKEN__28_'));
  const argumentList = callSuffix ? findFirstNonterminal(callSuffix, 'argumentExpressionList') : null;
  const argumentsToCompile = argumentList ? nonterminalChildren(argumentList, 'assignmentExpression') : [];
  const instructions = [];
  // Fixed signatures for non-variadic stdio functions (fopen, fwrite, etc.)
  const fixedStdIoHostSignatures = {
    __malloc: { paramTypes: ['i32'], resultType: 'i32' },
    __free: { paramTypes: ['i32'], resultType: null },
    fopen: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    freopen: { paramTypes: ['i32', 'i32', 'i32'], resultType: 'i32' },
    fclose: { paramTypes: ['i32'], resultType: 'i32' },
    fflush: { paramTypes: ['i32'], resultType: 'i32' },
    fread: { paramTypes: ['i32', 'i32', 'i32', 'i32'], resultType: 'i32' },
    fwrite: { paramTypes: ['i32', 'i32', 'i32', 'i32'], resultType: 'i32' },
    fseek: { paramTypes: ['i32', 'i32', 'i32'], resultType: 'i32' },
    ftell: { paramTypes: ['i32'], resultType: 'i32' },
    fgetpos: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    fsetpos: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    rewind: { paramTypes: ['i32'], resultType: null },
    clearerr: { paramTypes: ['i32'], resultType: null },
    feof: { paramTypes: ['i32'], resultType: 'i32' },
    ferror: { paramTypes: ['i32'], resultType: 'i32' },
    remove: { paramTypes: ['i32'], resultType: 'i32' },
    rename: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    fgetc: { paramTypes: ['i32'], resultType: 'i32' },
    fgets: { paramTypes: ['i32', 'i32', 'i32'], resultType: 'i32' },
    fputc: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    fputs: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    getc: { paramTypes: ['i32'], resultType: 'i32' },
    getchar: { paramTypes: [], resultType: 'i32' },
    putc: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    putchar: { paramTypes: ['i32'], resultType: 'i32' },
    puts: { paramTypes: ['i32'], resultType: 'i32' },
    ungetc: { paramTypes: ['i32', 'i32'], resultType: 'i32' }
  };
  // ctype.h — all functions take one int, return int; come from ctype.wasm linked lib
  const ctypeHostSignatures = {
    isalnum:  { paramTypes: ['i32'], resultType: 'i32' },
    isalpha:  { paramTypes: ['i32'], resultType: 'i32' },
    iscntrl:  { paramTypes: ['i32'], resultType: 'i32' },
    isdigit:  { paramTypes: ['i32'], resultType: 'i32' },
    isgraph:  { paramTypes: ['i32'], resultType: 'i32' },
    islower:  { paramTypes: ['i32'], resultType: 'i32' },
    isprint:  { paramTypes: ['i32'], resultType: 'i32' },
    ispunct:  { paramTypes: ['i32'], resultType: 'i32' },
    isspace:  { paramTypes: ['i32'], resultType: 'i32' },
    isupper:  { paramTypes: ['i32'], resultType: 'i32' },
    isxdigit: { paramTypes: ['i32'], resultType: 'i32' },
    tolower:  { paramTypes: ['i32'], resultType: 'i32' },
    toupper:  { paramTypes: ['i32'], resultType: 'i32' }
  };
  const timeLocaleHostSignatures = {
    time: { paramTypes: ['i32'], resultType: 'i32' },
    clock: { paramTypes: [], resultType: 'i32' },
    difftime: { paramTypes: ['i32', 'i32'], resultType: 'f64' },
    localtime: { paramTypes: ['i32'], resultType: 'i32' },
    gmtime: { paramTypes: ['i32'], resultType: 'i32' },
    mktime: { paramTypes: ['i32'], resultType: 'i32' },
    asctime: { paramTypes: ['i32'], resultType: 'i32' },
    ctime: { paramTypes: ['i32'], resultType: 'i32' },
    strftime: { paramTypes: ['i32', 'i32', 'i32', 'i32'], resultType: 'i32' },
    setlocale: { paramTypes: ['i32', 'i32'], resultType: 'i32' },
    localeconv: { paramTypes: [], resultType: 'i32' }
  };
  const setjmpHostSignatures = {
    setjmp: { paramTypes: ['i32'], resultType: 'i32', field: '_setjmp_capture_js' },
    longjmp: { paramTypes: ['i32', 'i32'], resultType: 'i32', field: '_longjmp_unwind_js' }
  };
  const variadicStdIoHostSignatures = {
    printf: { arity: 8, paramType: 'f64', resultType: 'i32' },
    fprintf: { arity: 9, paramType: 'f64', resultType: 'i32' },
    sprintf: { arity: 9, paramType: 'f64', resultType: 'i32' },
    vprintf: { arity: 2, paramType: 'f64', resultType: 'i32' },
    vsprintf: { arity: 3, paramType: 'f64', resultType: 'i32' },
    scanf: { arity: 8, paramType: 'i32', resultType: 'i32' },
    fscanf: { arity: 9, paramType: 'i32', resultType: 'i32' },
    sscanf: { arity: 9, paramType: 'i32', resultType: 'i32' }
  };

  // Handle host imports:
  //   1. Functions declared with the '__object__method' naming convention
  //      (registered by registerHostExternImport during module building).
  //   2. Legacy stdio variadic special-cases mapped to fixed f64 arity.
  //   3. Fixed-signature stdio non-variadic functions (fopen, fwrite, etc.)
  //   4. ctype.h functions (isalpha, isdigit, etc.) linked from ctype.wasm
  //
  // All handled here, BEFORE the generic args loop, so that arguments
  // can be coerced to the required WAT types before the call is emitted.
  {
    const hostFn = context.module.functionsByName.get(calleeName);
    const isNamedHostImport = !!(hostFn && hostFn.isHostImport);
    const variadicStdIoHost = variadicStdIoHostSignatures[calleeName] || null;
    const fixedStdIoHost = fixedStdIoHostSignatures[calleeName] || null;
    const ctypeHost = ctypeHostSignatures[calleeName] || null;
    const timeLocaleHost = timeLocaleHostSignatures[calleeName] || null;
    const setjmpHost = setjmpHostSignatures[calleeName] || null;
    const isVariadicStdIoHost = !!variadicStdIoHost;
    const isFixedStdIoHost = !!fixedStdIoHost;
    const isCtypeHost = !!ctypeHost;
    const isTimeLocaleHost = !!timeLocaleHost;
    const isSetjmpHost = !!setjmpHost;

    if (isNamedHostImport || isVariadicStdIoHost || isFixedStdIoHost || isCtypeHost || isTimeLocaleHost || isSetjmpHost) {
      let importDef;

      if (isVariadicStdIoHost) {
        // Variadic stdio hosts use fixed import arity/signatures so WAT can
        // coerce each argument deterministically before emitting the call.
        const hostArity = variadicStdIoHost.arity;
        const hostParamType = variadicStdIoHost.paramType || 'i32';
        importDef = ensureImportedFunction(context.module, {
          sourceName: calleeName,
          internalName: `imp_${sanitizeIdentifier(calleeName)}`,
          module: 'env',
          field: calleeName,
          paramTypes: new Array(hostArity).fill(hostParamType),
          resultType: variadicStdIoHost.resultType || 'i32'
        });
      } else if (isFixedStdIoHost) {
        importDef = ensureImportedFunction(context.module, {
          sourceName: calleeName,
          internalName: `imp_${sanitizeIdentifier(calleeName)}`,
          module: 'env',
          field: calleeName,
          paramTypes: fixedStdIoHost.paramTypes,
          resultType: fixedStdIoHost.resultType
        });
      } else if (isCtypeHost) {
        importDef = ensureImportedFunction(context.module, {
          sourceName: calleeName,
          internalName: `imp_${sanitizeIdentifier(calleeName)}`,
          module: 'env',
          field: calleeName,
          paramTypes: ctypeHost.paramTypes,
          resultType: ctypeHost.resultType
        });
      } else if (isTimeLocaleHost) {
        importDef = ensureImportedFunction(context.module, {
          sourceName: calleeName,
          internalName: `imp_${sanitizeIdentifier(calleeName)}`,
          module: 'env',
          field: calleeName,
          paramTypes: timeLocaleHost.paramTypes,
          resultType: timeLocaleHost.resultType
        });
      } else if (isSetjmpHost) {
        importDef = ensureImportedFunction(context.module, {
          sourceName: calleeName,
          internalName: `imp_${sanitizeIdentifier(calleeName)}`,
          module: 'env',
          field: setjmpHost.field || calleeName,
          paramTypes: setjmpHost.paramTypes,
          resultType: setjmpHost.resultType
        });
      } else {
        importDef = hostFn.importDef;
      }

      const paramTypes = importDef.paramTypes || [];
      const arity = isVariadicStdIoHost ? (variadicStdIoHost.arity || 0) : paramTypes.length;

      for (let i = 0; i < arity; i += 1) {
        const targetType = paramTypes[i] || (isVariadicStdIoHost ? (variadicStdIoHost.paramType || 'i32') : 'i32');
        if (i < argumentsToCompile.length) {
          const argNode = argumentsToCompile[i];
          const argType = inferExpressionType(argNode, context) || 'i32';
          const argInstr = compileExpression(argNode, context, { keepValue: true });
          instructions.push(...coerceInstructionsToType(argInstr, argType, targetType, context));
        } else {
          instructions.push(`${targetType}.const 0`);
        }
      }

      instructions.push(`call $${importDef.internalName}`);

      if (!keepValue && importDef.resultType !== null) {
        instructions.push('drop');
      }

      return instructions;
    }
  }

  const fn = context.module.functionsByName.get(calleeName) || null;

  if (fn && fn.isVariadic) {
    const paramTypes = Array.isArray(fn.params) ? fn.params.map((param) => toWatType(param.watType || 'i32')) : [];
    const fixedParamCount = Math.max(0, paramTypes.length - 1); // last param is __maiac_va_base
    const fixedArgumentNodes = argumentsToCompile.slice(0, fixedParamCount);
    const variadicArgumentNodes = argumentsToCompile.slice(fixedParamCount);

    for (let i = 0; i < fixedParamCount; i += 1) {
      const targetType = paramTypes[i] || 'i32';
      if (i < fixedArgumentNodes.length) {
        const argNode = fixedArgumentNodes[i];
        const argType = inferExpressionType(argNode, context) || 'i32';
        const argInstr = compileExpression(argNode, context, { keepValue: true });
        instructions.push(...coerceInstructionsToType(argInstr, argType, targetType, context));
      } else {
        instructions.push(`${targetType}.const 0`);
      }
    }

    if (variadicArgumentNodes.length === 0) {
      instructions.push('i32.const 0');
      instructions.push(`call $${sanitizeIdentifier(calleeName)}`);
      if (!keepValue && fn.resultType !== null) {
        instructions.push('drop');
      }
      return instructions;
    }

    context.module.usesLinearMemory = true;

    const savedSpLocal = ensureInternalLocal(context, '__maiac_va_sp_save', 'i32');
    const baseLocal = ensureInternalLocal(context, '__maiac_va_base_tmp', 'i32');

    const packedArgs = [];
    let packedSize = 0;
    for (const argNode of variadicArgumentNodes) {
      const inferred = inferExpressionType(argNode, context) || 'i32';
      const storeType = (inferred === 'f32' || inferred === 'f64') ? 'f64' : 'i32';
      const slotSize = storeType === 'f64' ? 8 : 4;
      packedArgs.push({ node: argNode, sourceType: inferred, storeType, offset: packedSize });
      packedSize += slotSize;
    }

    instructions.push(
      'global.get $__stack_ptr',
      `local.set $${savedSpLocal.name}`,
      'global.get $__stack_ptr',
      `i32.const ${packedSize}`,
      'i32.add',
      'global.set $__stack_ptr',
      `local.get $${savedSpLocal.name}`,
      `local.set $${baseLocal.name}`
    );

    for (const packed of packedArgs) {
      const valueInstructions = compileExpression(packed.node, context, { keepValue: true });
      instructions.push(
        `local.get $${baseLocal.name}`,
        `i32.const ${packed.offset}`,
        'i32.add',
        ...coerceInstructionsToType(valueInstructions, packed.sourceType, packed.storeType, context),
        packed.storeType === 'f64' ? 'f64.store' : 'i32.store'
      );
    }

    instructions.push(`local.get $${baseLocal.name}`);
    instructions.push(`call $${sanitizeIdentifier(calleeName)}`);
    instructions.push(`local.get $${savedSpLocal.name}`, 'global.set $__stack_ptr');

    if (!keepValue && fn.resultType !== null) {
      instructions.push('drop');
    }

    return instructions;
  }

  for (const argumentNode of argumentsToCompile) {
    instructions.push(...compileExpression(argumentNode, context, { keepValue: true }));
  }

  if (!fn) {
    const calleeSymbol = resolveSymbol(calleeName, context);
    if (!calleeSymbol || (calleeSymbol.pointerDepth || 0) <= 0) {
      for (let index = 0; index < argumentsToCompile.length; index += 1) {
        instructions.push('drop');
      }
      if (keepValue) {
        instructions.push('i32.const 0');
      }
      return instructions;
    }

    const indirectResultType = 'i32';
    const typeIndex = ensureFunctionType(
      context.module,
      argumentsToCompile.map(() => 'i32'),
      indirectResultType
    );

    instructions.push(...compileExpression(primaryExpression, context, { keepValue: true }));
    instructions.push(`call_indirect (type ${typeIndex})`);

    if (keepValue) {
      return instructions;
    }

    instructions.push('drop');
    return instructions;
  }

  instructions.push(`call $${sanitizeIdentifier(calleeName)}`);

  if (!keepValue && fn.resultType !== null) {
    instructions.push('drop');
  }

  return instructions;
}

function extractIdentifierFromNode(node) {
  const identifier = findFirstTerminal(node, 'Identifier');
  return identifier ? identifier.value : null;
}

function resolveSymbol(name, context) {
  return context.locals.get(name)
    || context.params.get(name)
    || context.module.globalsByName.get(name)
    || null;
}

function getLoadOpcodeForType(watType = 'i32') {
  switch (watType) {
    case 'i64': return 'i64.load';
    case 'f32': return 'f32.load';
    case 'f64': return 'f64.load';
    case 'i8':  return 'i32.load8_u';
    default:    return 'i32.load';
  }
}

function getStoreOpcodeForType(watType = 'i32') {
  switch (watType) {
    case 'i64': return 'i64.store';
    case 'f32': return 'f32.store';
    case 'f64': return 'f64.store';
    case 'i8':  return 'i32.store8';
    default:    return 'i32.store';
  }
}

function emitAddressOfSymbol(name, context) {
  const symbol = resolveSymbol(name, context);
  if (!symbol) {
    if (context.module && context.module.functionTableByName && context.module.functionTableByName.has(name)) {
      const fnInfo = context.module.functionTableByName.get(name);
      return [`i32.const ${fnInfo.tableIndex}`];
    }
    throw new CompilationError(`Unknown symbol '${name}'`, context.function.sourceName);
  }

  if (symbol.stackOffset != null) {
    return [
      'local.get $__frame',
      `i32.const ${symbol.stackOffset}`,
      'i32.add'
    ];
  }

  throw new CompilationError(`Address-of is currently supported only for frame-backed locals and parameters ('${name}')`, context.function.sourceName);
}

function emitIndexedAddress(name, indexExpression, context) {
  const accessInfo = getIndexedAccessInfo(name, indexExpression, context);
  return accessInfo.addressInstructions;
}

function emitLoadInstruction(name, context) {
  if (name === 'NULL') {
    return ['i32.const 0'];
  }

  if (String(name || '').includes('.')) {
    const memberAccess = resolveMemberAccess(name, context);
    if (!memberAccess) {
      throw new CompilationError(`Unknown symbol '${name}'`, context.function.sourceName);
    }
    return memberAccess.isStruct
      ? memberAccess.addressInstructions
      : [...memberAccess.addressInstructions, getLoadOpcodeForType(memberAccess.watType || 'i32')];
  }

  const symbol = resolveSymbol(name, context);
  if (!symbol) {
    if (context.module && context.module.functionTableByName && context.module.functionTableByName.has(name)) {
      const fnInfo = context.module.functionTableByName.get(name);
      return [`i32.const ${fnInfo.tableIndex}`];
    }
    throw new CompilationError(`Unknown symbol '${name}'`, context.function.sourceName);
  }

  if (symbol.isArray || symbol.isStruct) {
    return emitAddressOfSymbol(name, context);
  }

  if (symbol.stackOffset != null) {
    return [
      ...emitAddressOfSymbol(name, context),
      getLoadOpcodeForType(symbol.watType || 'i32')
    ];
  }

  if (context.locals.has(name) || context.params.has(name)) {
    return `local.get $${symbol.name}`;
  }

  return `global.get $${symbol.name}`;
}

function emitStoreToAddress(addressInstructions, rhsInstructions, watType, context, keepValue) {
  const instructions = [
    ...addressInstructions,
    ...rhsInstructions
  ];

  if (keepValue) {
    const tempLocal = ensureInternalLocal(context, `__tmp_${watType}`, watType || 'i32');
    instructions.push(`local.set $${tempLocal.name}`);
    instructions.push(`local.get $${tempLocal.name}`);
    instructions.push(getStoreOpcodeForType(watType || 'i32'));
    instructions.push(`local.get $${tempLocal.name}`);
    return instructions;
  }

  instructions.push(getStoreOpcodeForType(watType || 'i32'));
  return instructions;
}

function emitUpdateInstructions(name, delta, context, options = {}) {
  const prefix = options.prefix !== false;
  const keepValue = options.keepValue !== false;
  const memberAccess = String(name || '').includes('.') ? resolveMemberAccess(name, context) : null;
  const symbol = memberAccess ? null : resolveSymbol(name, context);

  if (!symbol && !memberAccess) {
    throw new CompilationError(`Unknown update target '${name}'`, context.function.sourceName);
  }

  const watType = memberAccess ? (memberAccess.watType || 'i32') : (symbol.watType || 'i32');
  const magnitude = Math.abs(delta);
  const addressInstructions = memberAccess
    ? memberAccess.addressInstructions
    : (symbol.stackOffset != null ? emitAddressOfSymbol(name, context) : null);

  let constInstruction = `i32.const ${magnitude}`;
  let arithmeticInstruction = delta >= 0 ? 'i32.add' : 'i32.sub';

  if (watType === 'i64') {
    constInstruction = `i64.const ${magnitude}`;
    arithmeticInstruction = delta >= 0 ? 'i64.add' : 'i64.sub';
  }

  if (addressInstructions) {
    const addrTemp = ensureInternalLocal(context, '__tmp_addr', 'i32');
    const valueTemp = ensureInternalLocal(context, `__tmp_${watType}`, watType);
    const instructions = [
      ...addressInstructions,
      `local.tee $${addrTemp.name}`,
      getLoadOpcodeForType(watType),
      constInstruction,
      arithmeticInstruction,
      `local.set $${valueTemp.name}`,
      `local.get $${addrTemp.name}`,
      `local.get $${valueTemp.name}`,
      getStoreOpcodeForType(watType)
    ];

    if (keepValue) {
      if (prefix) {
        instructions.push(`local.get $${valueTemp.name}`);
      } else {
        const oldValueTemp = ensureInternalLocal(context, `__tmp_old_${watType}`, watType);
        return [
          ...addressInstructions,
          `local.tee $${addrTemp.name}`,
          getLoadOpcodeForType(watType),
          `local.tee $${oldValueTemp.name}`,
          constInstruction,
          arithmeticInstruction,
          `local.set $${valueTemp.name}`,
          `local.get $${addrTemp.name}`,
          `local.get $${valueTemp.name}`,
          getStoreOpcodeForType(watType),
          `local.get $${oldValueTemp.name}`
        ];
      }
    }

    return instructions;
  }

  const isLocal = context.locals.has(name) || context.params.has(name);
  const loadInstruction = isLocal ? `local.get $${symbol.name}` : `global.get $${symbol.name}`;
  const setInstruction = isLocal ? `local.set $${symbol.name}` : `global.set $${symbol.name}`;
  const teeInstruction = isLocal ? `local.tee $${symbol.name}` : null;

  if (prefix) {
    const instructions = [
      loadInstruction,
      constInstruction,
      arithmeticInstruction
    ];

    if (teeInstruction && keepValue) {
      instructions.push(teeInstruction);
    } else {
      instructions.push(setInstruction);
      if (keepValue) {
        instructions.push(loadInstruction);
      }
    }

    return instructions;
  }

  if (keepValue) {
    return [
      loadInstruction,
      loadInstruction,
      constInstruction,
      arithmeticInstruction,
      setInstruction
    ];
  }

  return [
    loadInstruction,
    constInstruction,
    arithmeticInstruction,
    setInstruction
  ];
}

function emitStoreInstructions(name, rhsInstructions, context, keepValue) {
  const symbol = resolveSymbol(name, context);
  if (!symbol) {
    throw new CompilationError(`Unknown assignment target '${name}'`, context.function.sourceName);
  }

  if (symbol.stackOffset != null) {
    return emitStoreToAddress(
      emitAddressOfSymbol(name, context),
      rhsInstructions,
      symbol.watType || 'i32',
      context,
      keepValue
    );
  }

  if (context.locals.has(name) || context.params.has(name)) {
    return rhsInstructions.concat(keepValue ? `local.tee $${symbol.name}` : `local.set $${symbol.name}`);
  }

  const instructions = rhsInstructions.concat(`global.set $${symbol.name}`);
  if (keepValue) {
    instructions.push(`global.get $${symbol.name}`);
  }
  return instructions;
}

function registerStringLiteral(text, moduleModel) {
  if (moduleModel.stringLiterals.has(text)) {
    return moduleModel.stringLiterals.get(text);
  }

  const values = [...parseCStringLiteral(text), 0];
  // Store as raw bytes (1 byte per char), not 4-byte words.
  const bytes = values.map((v) => Number(v) & 0xFF);
  const offset = alignTo(moduleModel.nextDataOffset || 0, 4);
  const dataSegment = {
    offset,
    bytes
  };

  moduleModel.dataSegments.push(dataSegment);
  moduleModel.stringLiterals.set(text, dataSegment);
  moduleModel.nextDataOffset = offset + bytes.length;
  moduleModel.usesLinearMemory = true;
  return dataSegment;
}

function emitStringLiteralAddress(text, context) {
  const dataSegment = registerStringLiteral(text, context.module);
  return [`i32.const ${dataSegment.offset}`];
}

function emitWatFromModule(moduleModel) {
  return renderModule(moduleModel);
}

function stripWatComments(source) {
  return String(source)
    .replace(/^\s*;;.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateWat(wat) {
  if (!WatAssembler) {
    return null;
  }

  const assembler = new WatAssembler();
  const wasm = assembler.assemble(stripWatComments(wat));

  if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.Module === 'function') {
    new WebAssembly.Module(wasm);
  }

  return wasm;
}

// Built-in include directory shipped with the compiler (maiac_compat.h etc.).
const COMPILER_INCLUDE_DIR = path.join(__dirname, 'include');
// Project-level public headers (stdlib.h, string.h, ...).
const PROJECT_INCLUDE_DIR = path.join(__dirname, '..', 'include');

function compileSource(source, options = {}) {
  const backend = options.backend || 'wat';
  const emitter = SUPPORTED_BACKENDS[backend];

  if (!emitter) {
    throw new Error(`Unsupported backend '${backend}'. Supported backends: ${Object.keys(SUPPORTED_BACKENDS).join(', ')}`);
  }

  // Always add the compiler's own include/ dir so <maiac_compat.h> resolves.
  const includeDirs = [
    COMPILER_INCLUDE_DIR,
    PROJECT_INCLUDE_DIR,
    ...(options.includeDirs || [])
  ];

  const parsed = parseCSource(source, {
    sourcePath: options.sourcePath || null,
    includeDirs,
    resolveSystemIncludes: options.resolveSystemIncludes === true
  });
  const moduleModel = buildModuleModel(parsed.ast, {
    aggregateTags: collectNamedAggregateTags(parsed.normalizedSource || source)
  });
  const wat = emitter(moduleModel, options);

  let wasm = null;
  let validationError = null;

  if (options.validate !== false) {
    try {
      wasm = validateWat(wat);
    } catch (error) {
      validationError = error;
      if (options.wasmOut) {
        throw error;
      }
    }
  }

  // Collect annotated host-import descriptors so callers can generate the
  // corresponding JS env wrapper without parsing the WAT themselves.
  const hostImports = (moduleModel.imports || [])
    .filter((imp) => imp.hostInfo != null);

  return {
    ...parsed,
    module: moduleModel,
    wat,
    wasm,
    validationError,
    hostImports
  };
}

function parseArguments(argv) {
  const options = {
    backend: 'wat',
    showAst: false,
    printJson: false,
    printXml: false,
    printWat: true,
    validate: true,
    sourceText: '',
    sourcePath: null,
    jsonOut: null,
    xmlOut: null,
    watOut: null,
    wasmOut: null
  };

  const positional = [];

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--ast':
        options.showAst = true;
        break;
      case '--print-json':
        options.printJson = true;
        break;
      case '--print-xml':
        options.printXml = true;
        break;
      case '--no-wat':
        options.printWat = false;
        break;
      case '--no-validate':
        options.validate = false;
        break;
      case '--backend':
        options.backend = argv[++index];
        break;
      case '--code':
        options.sourceText = argv[++index] || '';
        break;
      case '--file':
        options.sourcePath = argv[++index] || null;
        break;
      case '--json-out':
        options.jsonOut = argv[++index] || null;
        break;
      case '--xml-out':
        options.xmlOut = argv[++index] || null;
        break;
      case '--wat-out':
        options.watOut = argv[++index] || null;
        break;
      case '--wasm-out':
        options.wasmOut = argv[++index] || null;
        break;
      default:
        positional.push(arg);
        break;
    }
  }

  if (!options.sourceText && !options.sourcePath && positional.length > 0) {
    const candidatePath = positional[0];
    if (positional.length === 1 && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      options.sourcePath = candidatePath;
    } else {
      options.sourceText = positional.join(' ');
    }
  }

  return options;
}

function getSourceFromOptions(options) {
  if (options.sourcePath) {
    return fs.readFileSync(path.resolve(options.sourcePath), 'utf8');
  }

  return String(options.sourceText || '').trim();
}

function writeOutputFile(filePath, content) {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
}

function printUsage() {
  console.log('Usage:');
  console.log('  node c-compiler.js "int main() { return 0; }"');
  console.log('  node c-compiler.js --file ./examples/test.c --ast --json-out out/test.json --xml-out out/test.xml --wat-out out/test.wat');
  console.log('');
  console.log('Options:');
  console.log('  --code <c-code>      Parse inline C source code');
  console.log('  --file <path>        Read C source from a file');
  console.log('  --backend <name>     Output backend (default: wat)');
  console.log('  --ast                Print the AST / parse tree');
  console.log('  --print-json         Print the JSON parse tree');
  console.log('  --print-xml          Print the XML parse tree');
  console.log('  --json-out <path>    Save the JSON parse tree');
  console.log('  --xml-out <path>     Save the XML parse tree');
  console.log('  --wat-out <path>     Save the generated WAT');
  console.log('  --wasm-out <path>    Assemble the generated WAT to WASM');
  console.log('  --no-wat             Do not print WAT to stdout');
  console.log('  --no-validate        Skip WAT validation with maiawasm');
  console.log('  --help               Show this help message');
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const source = getSourceFromOptions(options);
  if (!source) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  try {
    const result = compileSource(source, options);

    if (options.showAst) {
      console.log('--- AST ---');
      printTree(result.ast);
      console.log('');
    }

    if (options.printXml) {
      console.log('--- XML ---');
      console.log(result.xml);
      console.log('');
    }

    if (options.printJson) {
      console.log('--- JSON ---');
      console.log(result.json);
      console.log('');
    }

    if (options.printWat) {
      if (options.showAst || options.printXml || options.printJson) {
        console.log('--- WAT ---');
      }
      console.log(result.wat);
    }

    if (options.jsonOut) {
      writeOutputFile(options.jsonOut, result.json);
    }

    if (options.xmlOut) {
      writeOutputFile(options.xmlOut, result.xml);
    }

    if (options.watOut) {
      writeOutputFile(options.watOut, result.wat);
    }

    if (options.wasmOut) {
      if (!result.wasm) {
        throw result.validationError || new Error('WASM output was requested, but WAT validation / assembly is not available.');
      }
      writeOutputFile(options.wasmOut, result.wasm);
    }
  } catch (error) {
    console.error(`Compilation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  CompilationError,
  parseCSource,
  preprocessCSource,
  buildModuleModel,
  compileSource,
  emitWatFromModule,
  parseArguments,
  parseHostExternName,
  main
};
'use strict';

const fs = require('fs');
const path = require('path');

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseCIntegerLiteral(text) {
  const value = String(text || '').trim().replace(/[uUlL]+$/g, '');
  if (/^0[xX][0-9a-fA-F]+$/.test(value)) return parseInt(value.slice(2), 16);
  if (/^0[bB][01]+$/.test(value)) return parseInt(value.slice(2), 2);
  if (/^0[0-7]+$/.test(value) && value.length > 1) return parseInt(value.slice(1), 8);
  return parseInt(value, 10);
}

function parseCCharacterLiteral(text) {
  const raw = String(text || '').trim();
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

function normalizeNewlines(source) {
  return String(source || '').replace(/\r\n?/g, '\n');
}

function joinLineContinuations(source) {
  return normalizeNewlines(source).replace(/\\\n/g, ' ');
}

function synthesizeTypedefTag(kind, alias) {
  return `__maiac_${kind}_${alias}`;
}

function injectAnonymousTypedefTags(source) {
  let text = String(source || '');

  for (const kind of ['struct', 'union', 'enum']) {
    const pattern = new RegExp(`typedef\\s+${kind}\\s*\\{([\\s\\S]*?)\\}\\s*([A-Za-z_]\\w*)\\s*;`, 'g');
    text = text.replace(pattern, (_match, body, alias) => {
      const tag = synthesizeTypedefTag(kind, alias);
      return `typedef ${kind} ${tag} {${body}} ${alias};`;
    });
  }

  return text;
}

function collectNamedAggregateTags(source) {
  const tags = [];
  const text = String(source || '');
  const pattern = /\b(?:struct|union)\s+([A-Za-z_]\w*)\s*\{/g;
  let match = null;

  while ((match = pattern.exec(text)) !== null) {
    tags.push(match[1]);
  }

  return tags;
}

function collectTypedefAliases(source) {
  const text = String(source || '');
  const aliases = new Map([
    ['size_t', 'int']
  ]);

  const patterns = [
    {
      // Example: typedef int (*binop_t)(int, int);
      // We normalize this alias as a pointer-like type for current compiler typing.
      regex: /typedef\s+([A-Za-z_][\w\s]*?)\s*\(\s*\*\s*([A-Za-z_]\w*)\s*\)\s*\([^;]*\)\s*;/g,
      createReplacement: (match) => `${String(match[1] || '').trim()} *`.trim(),
      aliasIndex: 2
    },
    {
      regex: /typedef\s+struct\s+([A-Za-z_]\w*)\s*\{[\s\S]*?\}\s*([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `struct ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+union\s+([A-Za-z_]\w*)\s*\{[\s\S]*?\}\s*([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `union ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+enum\s+([A-Za-z_]\w*)\s*\{[\s\S]*?\}\s*([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `enum ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+struct\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `struct ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+enum\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `enum ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+union\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `union ${match[1]}`,
      aliasIndex: 2
    },
    {
      regex: /typedef\s+([A-Za-z_][\w\s]*?)\s*(\*+)\s*([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => `${String(match[1] || '').trim()} ${match[2]}`.trim(),
      aliasIndex: 3
    },
    {
      regex: /typedef\s+([A-Za-z_][\w\s]*?)\s+([A-Za-z_]\w*)\s*;/g,
      createReplacement: (match) => String(match[1] || '').trim(),
      aliasIndex: 2
    }
  ];

  for (const pattern of patterns) {
    let match = null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const aliasName = match[pattern.aliasIndex];
      if (!aliasName || aliases.has(aliasName)) {
        continue;
      }
      aliases.set(aliasName, pattern.createReplacement(match));
    }
  }

  return aliases;
}

function parseDefineDirective(rest, macros) {
  const functionMatch = String(rest || '').match(/^([A-Za-z_]\w*)\(([^)]*)\)\s*(.*)$/);

  if (functionMatch) {
    const [, name, paramsText, bodyText] = functionMatch;
    const params = paramsText.trim()
      ? paramsText.split(',').map((param) => param.trim()).filter(Boolean)
      : [];
    macros.set(name, {
      kind: 'function',
      params,
      body: String(bodyText || '').trim()
    });
    return;
  }

  const objectMatch = String(rest || '').match(/^([A-Za-z_]\w*)(?:\s+(.*))?$/);
  if (objectMatch) {
    macros.set(objectMatch[1], {
      kind: 'object',
      params: [],
      body: String(objectMatch[2] || '1').trim()
    });
  }
}

function evaluateConditionalExpression(expression, macros) {
  let expr = String(expression || '').trim();
  if (!expr) return false;

  expr = expr
    .replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)/g, (_match, name) => (macros.has(name) ? '1' : '0'))
    .replace(/defined\s+([A-Za-z_]\w*)/g, (_match, name) => (macros.has(name) ? '1' : '0'))
    .replace(/L?'([^'\\]|\\.)*'/g, (literal) => String(parseCCharacterLiteral(literal)))
    .replace(/\b(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]+|[0-9]+)\s*[uUlL]+\b/g, '$1')
    .replace(/\b([A-Za-z_]\w*)\b/g, (name) => {
      if (name === 'true') return '1';
      if (name === 'false') return '0';
      const macro = macros.get(name);
      if (!macro || macro.kind !== 'object') return '0';
      const body = String(macro.body || '').trim();
      if (!body) return '0';
      if (/^[-+]?\d+$/.test(body) || /^0[xX][0-9a-fA-F]+$/.test(body) || /^0[bB][01]+$/.test(body) || /^0[0-7]+$/.test(body)) {
        return String(parseCIntegerLiteral(body));
      }
      return '0';
    });

  try {
    return !!Function(`"use strict"; return Number((${expr})) ? 1 : 0;`)();
  } catch (_error) {
    return false;
  }
}

function createIncludeContext(options = {}) {
  const includeStack = new Set();
  const sourcePath = options.sourcePath || null;
  const sourceDir = sourcePath ? path.dirname(path.resolve(sourcePath)) : process.cwd();
  const resolveSystemIncludes = options.resolveSystemIncludes === true;

  // Extra directories to search for #include "..." (user includes).
  // Always appended after the source-file directory.
  const includeDirs = Array.isArray(options.includeDirs) ? options.includeDirs : [];

  const resolveInclude = options.resolveInclude || ((includePath, includeKind, fromDir) => {
    if (includeKind === 'system' && !resolveSystemIncludes) {
      return null;
    }

    if (includeKind !== 'system') {
      // 1. Local include: relative to the currently-processed file.
      const primary = path.resolve(fromDir || sourceDir, includePath);
      if (fs.existsSync(primary)) return primary;
    }

    // 2. System include (and local fallback): walk configured include dirs.
    for (const dir of includeDirs) {
      const candidate = path.resolve(dir, includePath);
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  });

  return {
    includeStack,
    sourceDir,
    resolveInclude
  };
}

function processPreprocessorDirectives(source, options = {}) {
  const context = createIncludeContext(options);
  const macros = new Map();

  // Predefined macros
  macros.set('__MAIAC__', { kind: 'object', tokens: ['1'] });
  macros.set('__MAIAC_VERSION__', { kind: 'object', tokens: ['1'] });

  const processText = (text, currentDir) => {
    const outputLines = [];
    const conditionStack = [{ parentActive: true, isActive: true, branchTaken: false }];
    const lines = normalizeNewlines(text).split('\n');

    const isActive = () => conditionStack[conditionStack.length - 1].isActive;

    for (const line of lines) {
      const trimmed = line.trim();
      const directiveMatch = trimmed.match(/^#\s*([A-Za-z_][A-Za-z0-9_]*)\b(.*)$/);

      if (!directiveMatch) {
        outputLines.push(isActive() ? line : '');
        continue;
      }

      const directive = directiveMatch[1];
      const rest = String(directiveMatch[2] || '').trim();

      if (directive === 'if' || directive === 'ifdef' || directive === 'ifndef') {
        const parentActive = isActive();
        let cond = false;

        if (directive === 'if') {
          cond = evaluateConditionalExpression(rest, macros);
        } else if (directive === 'ifdef') {
          cond = macros.has(rest);
        } else {
          cond = !macros.has(rest);
        }

        const active = parentActive && cond;
        conditionStack.push({ parentActive, isActive: active, branchTaken: active });
        outputLines.push('');
        continue;
      }

      if (directive === 'elif') {
        if (conditionStack.length > 1) {
          const current = conditionStack[conditionStack.length - 1];
          const cond = current.parentActive && !current.branchTaken && evaluateConditionalExpression(rest, macros);
          current.isActive = cond;
          current.branchTaken = current.branchTaken || cond;
        }
        outputLines.push('');
        continue;
      }

      if (directive === 'else') {
        if (conditionStack.length > 1) {
          const current = conditionStack[conditionStack.length - 1];
          const cond = current.parentActive && !current.branchTaken;
          current.isActive = cond;
          current.branchTaken = true;
        }
        outputLines.push('');
        continue;
      }

      if (directive === 'endif') {
        if (conditionStack.length > 1) {
          conditionStack.pop();
        }
        outputLines.push('');
        continue;
      }

      if (!isActive()) {
        outputLines.push('');
        continue;
      }

      if (directive === 'define') {
        parseDefineDirective(rest, macros);
        outputLines.push('');
        continue;
      }

      if (directive === 'undef') {
        const name = rest.split(/\s+/)[0] || '';
        if (name) {
          macros.delete(name);
        }
        outputLines.push('');
        continue;
      }

      if (directive === 'include') {
        const includeMatch = rest.match(/^"([^"]+)"|^<([^>]+)>/);
        if (!includeMatch) {
          outputLines.push('');
          continue;
        }

        const includePath = includeMatch[1] || includeMatch[2] || '';
        const includeKind = includeMatch[1] ? 'local' : 'system';
        const resolvedPath = context.resolveInclude(includePath, includeKind, currentDir || context.sourceDir);

        if (!resolvedPath || context.includeStack.has(resolvedPath)) {
          outputLines.push('');
          continue;
        }

        try {
          context.includeStack.add(resolvedPath);
          const includedSource = fs.readFileSync(resolvedPath, 'utf8');
          const normalizedIncluded = injectAnonymousTypedefTags(joinLineContinuations(includedSource));
          outputLines.push(processText(normalizedIncluded, path.dirname(resolvedPath)));
        } catch (_error) {
          outputLines.push('');
        } finally {
          context.includeStack.delete(resolvedPath);
        }

        continue;
      }

      outputLines.push('');
    }

    return outputLines.join('\n');
  };

  return {
    macros,
    text: processText(source, context.sourceDir)
  };
}

function readMacroInvocation(text, openParenIndex) {
  if (text[openParenIndex] !== '(') {
    return null;
  }

  const args = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = openParenIndex; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inSingleQuote) {
      current += char;
      if (char === '\\' && next != null) {
        current += next;
        index += 1;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '\\' && next != null) {
        current += next;
        index += 1;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      current += char;
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      current += char;
      inDoubleQuote = true;
      continue;
    }

    if (char === '(') {
      depth += 1;
      if (depth > 1) {
        current += char;
      }
      continue;
    }

    if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        const finalArg = current.trim();
        if (finalArg || args.length > 0) {
          args.push(finalArg);
        }
        return {
          args,
          endIndex: index + 1
        };
      }
      current += char;
      continue;
    }

    if (char === ',' && depth === 1) {
      args.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  return null;
}

function expandFunctionMacro(macro, args) {
  let expanded = String(macro.body || '');
  const rawArgsByParam = new Map();
  const cookedArgsByParam = new Map();

  for (let index = 0; index < macro.params.length; index += 1) {
    const param = macro.params[index];
    const rawValue = String(args[index] || '').trim();
    rawArgsByParam.set(param, rawValue);
    cookedArgsByParam.set(param, `(${rawValue})`);
  }

  // Token pasting (##): concatenate raw argument tokens before regular substitution.
  expanded = expanded.replace(/\b([A-Za-z_]\w*)\b\s*##\s*\b([A-Za-z_]\w*)\b/g, (_match, left, right) => {
    const leftValue = rawArgsByParam.has(left) ? rawArgsByParam.get(left) : left;
    const rightValue = rawArgsByParam.has(right) ? rawArgsByParam.get(right) : right;
    return `${String(leftValue || '').trim()}${String(rightValue || '').trim()}`;
  });

  // Stringification (#): preserve the raw argument spelling in a string literal.
  for (const param of macro.params) {
    const rawValue = String(rawArgsByParam.get(param) || '');
    const stringified = '"' + rawValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    expanded = expanded.replace(new RegExp(`#\\s*\\b${escapeRegex(param)}\\b`, 'g'), stringified);
  }

  for (const param of macro.params) {
    const value = cookedArgsByParam.get(param) || '(0)';
    expanded = expanded.replace(new RegExp(`\\b${escapeRegex(param)}\\b`, 'g'), value);
  }

  return expanded ? `(${expanded})` : '';
}

function expandStdargBuiltinMacro(name, args) {
  const apExpr = String(args[0] || '0').trim();
  const typeExpr = String(args[1] || 'int').trim() || 'int';

  if (name === 'va_start') {
    // Bind va_list directly to the compiler-provided variadic-base pointer.
    return `((${apExpr} = (char *)__maiac_va_base))`;
  }

  if (name === 'va_arg') {
    // Expand to parseable C cast form: (type *) ...
    return `(*((` + typeExpr + ` *)(((` + apExpr + ` += sizeof(` + typeExpr + `)) - sizeof(` + typeExpr + `)))))`;
  }

  if (name === 'va_end') {
    return `((${apExpr} = (char *)0))`;
  }

  return null;
}

function expandMacrosOnce(source, macros) {
  let result = '';
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      result += char;
      if (char === '\n') {
        inLineComment = false;
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      result += char;
      if (char === '*' && next === '/') {
        result += '/';
        index += 2;
        inBlockComment = false;
        continue;
      }
      index += 1;
      continue;
    }

    if (inSingleQuote) {
      result += char;
      if (char === '\\' && next != null) {
        result += next;
        index += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      index += 1;
      continue;
    }

    if (inDoubleQuote) {
      result += char;
      if (char === '\\' && next != null) {
        result += next;
        index += 2;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      result += '//';
      index += 2;
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      result += '/*';
      index += 2;
      inBlockComment = true;
      continue;
    }

    if (char === "'") {
      result += char;
      index += 1;
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      result += char;
      index += 1;
      inDoubleQuote = true;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let cursor = index + 1;
      while (cursor < source.length && /[A-Za-z0-9_]/.test(source[cursor])) {
        cursor += 1;
      }

      const identifier = source.slice(index, cursor);
      const macro = macros.get(identifier);

      if (!macro) {
        result += identifier;
        index = cursor;
        continue;
      }

      if (macro.kind === 'object') {
        result += macro.body ? `(${macro.body})` : '1';
        index = cursor;
        continue;
      }

      let callIndex = cursor;
      while (callIndex < source.length && /\s/.test(source[callIndex])) {
        callIndex += 1;
      }

      if (source[callIndex] !== '(') {
        result += identifier;
        index = cursor;
        continue;
      }

      const invocation = readMacroInvocation(source, callIndex);
      if (!invocation) {
        result += identifier;
        index = cursor;
        continue;
      }

      const stdargBuiltin = expandStdargBuiltinMacro(identifier, invocation.args);
      if (stdargBuiltin != null) {
        result += stdargBuiltin;
      } else {
        result += expandFunctionMacro(macro, invocation.args);
      }
      index = invocation.endIndex;
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function expandMacros(source, macros) {
  let text = String(source || '');

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const expanded = expandMacrosOnce(text, macros);
    if (expanded === text) {
      break;
    }
    text = expanded;
  }

  return text;
}

function previousIdentifierAt(text, index) {
  let cursor = (index | 0) - 1;
  while (cursor >= 0 && /\s/.test(text[cursor])) {
    cursor -= 1;
  }
  if (cursor < 0 || !/[A-Za-z0-9_]/.test(text[cursor])) {
    return '';
  }
  const end = cursor + 1;
  while (cursor >= 0 && /[A-Za-z0-9_]/.test(text[cursor])) {
    cursor -= 1;
  }
  return text.slice(cursor + 1, end);
}

function preprocessCSource(source, options = {}) {
  // This layer still performs source-to-source normalization before parsing.
  // It is intentionally more than a directive expander because the current
  // parser/compiler pipeline relies on textual rewrites for typedef aliases,
  // pointer/function-pointer aliases, and a few token-shape compat paths.
  let text = injectAnonymousTypedefTags(joinLineContinuations(source));
  const { macros, text: withoutDirectives } = processPreprocessorDirectives(text, options);
  text = expandMacros(withoutDirectives, macros);

  const typedefAliases = collectTypedefAliases(text);
  const functionPointerAliases = new Map();
  const strippedKeywords = new Set(['static', 'register', 'extern', 'auto']);

  text = text.replace(
    /([A-Za-z_][\w\s*]*?)\(\s*\*\s*([A-Za-z_]\w*)\s*\)\s*\(([^;{}]*)\)\s*=\s*&\s*([A-Za-z_]\w*)\s*;/g,
    (_match, returnType, aliasName, _params, targetName) => {
      functionPointerAliases.set(aliasName, targetName);
      const normalizedType = String(returnType || 'int').trim().replace(/\s+/g, ' ');
      return `${normalizedType} *${aliasName} = 0;`;
    }
  );

  for (const [aliasName, targetName] of functionPointerAliases.entries()) {
    text = text.replace(new RegExp(`\\(\\s*\\*\\s*${escapeRegex(aliasName)}\\s*\\)\\s*\\(`, 'g'), `${targetName}(`);
    text = text.replace(new RegExp(`\\b${escapeRegex(aliasName)}\\s*\\(`, 'g'), `${targetName}(`);
  }

  let result = '';
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let inPreprocessor = false;
  let inTypedefStatement = false;
  let typedefBraceDepth = 0;
  let lineHasOnlyWhitespace = true;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (inPreprocessor) {
      if (char === '\n') {
        result += '\n';
        inPreprocessor = false;
        lineHasOnlyWhitespace = true;
      } else {
        result += ' ';
      }
      index += 1;
      continue;
    }

    if (inLineComment) {
      if (char === '\n') {
        result += '\n';
        inLineComment = false;
        lineHasOnlyWhitespace = true;
      } else {
        result += ' ';
      }
      index += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        result += '  ';
        index += 2;
        inBlockComment = false;
        continue;
      }
      result += char === '\n' ? '\n' : ' ';
      if (char === '\n') {
        lineHasOnlyWhitespace = true;
      }
      index += 1;
      continue;
    }

    if (inSingleQuote) {
      result += char;
      if (char === '\\' && next != null) {
        result += next;
        index += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      index += 1;
      lineHasOnlyWhitespace = false;
      continue;
    }

    if (inDoubleQuote) {
      result += char;
      if (char === '\\' && next != null) {
        result += next;
        index += 2;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      index += 1;
      lineHasOnlyWhitespace = false;
      continue;
    }

    if (lineHasOnlyWhitespace && char === '#') {
      result += ' ';
      index += 1;
      inPreprocessor = true;
      continue;
    }

    if (char === '/' && next === '/') {
      result += '  ';
      index += 2;
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      result += '  ';
      index += 2;
      inBlockComment = true;
      continue;
    }

    if (char === "'") {
      let literal = char;
      let cursor = index + 1;
      let closed = false;

      while (cursor < text.length) {
        const current = text[cursor];
        literal += current;

        if (current === '\\' && cursor + 1 < text.length) {
          literal += text[cursor + 1];
          cursor += 2;
          continue;
        }

        cursor += 1;
        if (current === "'") {
          closed = true;
          break;
        }
      }

      if (closed) {
        try {
          result += String(parseCCharacterLiteral(literal));
          index = cursor;
          lineHasOnlyWhitespace = false;
          continue;
        } catch (_error) {
          result += literal;
          index = cursor;
          lineHasOnlyWhitespace = false;
          continue;
        }
      }

      result += char;
      inSingleQuote = true;
      index += 1;
      lineHasOnlyWhitespace = false;
      continue;
    }

    if (char === '"') {
      result += char;
      inDoubleQuote = true;
      index += 1;
      lineHasOnlyWhitespace = false;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let cursor = index + 1;
      while (cursor < text.length && /[A-Za-z0-9_]/.test(text[cursor])) {
        cursor += 1;
      }

      const identifier = text.slice(index, cursor);
      if (identifier === 'typedef') {
        inTypedefStatement = true;
      }

      const allowTypedefSubstitution = !inTypedefStatement || typedefBraceDepth > 0;

      if (allowTypedefSubstitution && strippedKeywords.has(identifier)) {
        result += ' '.repeat(identifier.length);
      } else if (allowTypedefSubstitution && typedefAliases.has(identifier)) {
        const replacement = typedefAliases.get(identifier);
        const previousIdentifier = previousIdentifierAt(text, index);
        const beginsWithStruct = typeof replacement === 'string' && replacement.startsWith('struct ');
        const beginsWithUnion = typeof replacement === 'string' && replacement.startsWith('union ');
        const beginsWithEnum = typeof replacement === 'string' && replacement.startsWith('enum ');
        if ((beginsWithStruct && previousIdentifier === 'struct') ||
            (beginsWithUnion && previousIdentifier === 'union') ||
            (beginsWithEnum && previousIdentifier === 'enum')) {
          result += identifier;
        } else {
          result += replacement;
        }
      } else {
        result += identifier;
      }

      index = cursor;
      lineHasOnlyWhitespace = false;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const previous = index > 0 ? text[index - 1] : '';
      if (!/[A-Za-z0-9_.]/.test(previous || '')) {
        const remaining = text.slice(index);
        const numericMatch = remaining.match(/^(0[xX][0-9a-fA-F]+|0[bB][01]+|0[0-7]+|[0-9]+)([uUlL]+)?\b/);
        if (numericMatch && (numericMatch[2] || /^0[xXbB]/.test(numericMatch[1]) || /^0[0-7]+$/.test(numericMatch[1]))) {
          result += String(parseCIntegerLiteral(numericMatch[1]));
          index += numericMatch[0].length;
          lineHasOnlyWhitespace = false;
          continue;
        }
      }
    }

    result += char;
    if (inTypedefStatement && char === '{') {
      typedefBraceDepth += 1;
    } else if (inTypedefStatement && char === '}') {
      typedefBraceDepth = Math.max(0, typedefBraceDepth - 1);
    }
    if (char === ';' && (!inTypedefStatement || typedefBraceDepth === 0)) {
      inTypedefStatement = false;
    }
    if (char === '\n') {
      lineHasOnlyWhitespace = true;
    } else if (!/\s/.test(char)) {
      lineHasOnlyWhitespace = false;
    }
    index += 1;
  }

  return result;
}

module.exports = {
  collectNamedAggregateTags,
  collectTypedefAliases,
  preprocessCSource,
  normalizeSourceForCurrentParser: preprocessCSource
};

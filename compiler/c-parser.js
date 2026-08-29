class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.tokens = [];
    this.charClassDepth = 0;
    this.templateDepth = 0;
    this.tokenPatterns = [    { type: 'TOKEN__3B_', regex: /^;/ },    { type: 'TOKEN_auto', regex: /^auto/ },    { type: 'TOKEN_register', regex: /^register/ },    { type: 'TOKEN_static', regex: /^static/ },    { type: 'TOKEN_extern', regex: /^extern/ },    { type: 'TOKEN_typedef', regex: /^typedef/ },    { type: 'TOKEN_void', regex: /^void/ },    { type: 'TOKEN_char', regex: /^char/ },    { type: 'TOKEN_short', regex: /^short/ },    { type: 'TOKEN_int', regex: /^int/ },    { type: 'TOKEN_long', regex: /^long/ },    { type: 'TOKEN_float', regex: /^float/ },    { type: 'TOKEN_double', regex: /^double/ },    { type: 'TOKEN_signed', regex: /^signed/ },    { type: 'TOKEN_unsigned', regex: /^unsigned/ },    { type: 'TOKEN_const', regex: /^const/ },    { type: 'TOKEN_volatile', regex: /^volatile/ },    { type: 'TOKEN__7B_', regex: /^\{/ },    { type: 'TOKEN__7D_', regex: /^\}/ },    { type: 'TOKEN_struct', regex: /^struct/ },    { type: 'TOKEN_union', regex: /^union/ },    { type: 'TOKEN__2C_', regex: /^,/ },    { type: 'TOKEN__3D_', regex: /^=/ },    { type: 'TOKEN__3A_', regex: /^:/ },    { type: 'TOKEN_enum', regex: /^enum/ },    { type: 'TOKEN__28_', regex: /^\(/ },    { type: 'TOKEN__29_', regex: /^\)/ },    { type: 'TOKEN__5B_', regex: /^\[/ },    { type: 'TOKEN__5D_', regex: /^\]/ },    { type: 'TOKEN__2A_', regex: /^\*/ },    { type: 'TOKEN__2E__2E__2E_', regex: /^\.\.\./ },    { type: 'TOKEN__2E_', regex: /^\./ },    { type: 'TOKEN_case', regex: /^case/ },    { type: 'TOKEN_default', regex: /^default/ },    { type: 'TOKEN_if', regex: /^if/ },    { type: 'TOKEN_else', regex: /^else/ },    { type: 'TOKEN_switch', regex: /^switch/ },    { type: 'TOKEN_while', regex: /^while/ },    { type: 'TOKEN_do', regex: /^do/ },    { type: 'TOKEN_for', regex: /^for/ },    { type: 'TOKEN_goto', regex: /^goto/ },    { type: 'TOKEN_continue', regex: /^continue/ },    { type: 'TOKEN_break', regex: /^break/ },    { type: 'TOKEN_return', regex: /^return/ },    { type: 'TOKEN__2A__3D_', regex: /^\*=/ },    { type: 'TOKEN__2F__3D_', regex: /^\/=/ },    { type: 'TOKEN__25__3D_', regex: /^%=/ },    { type: 'TOKEN__2B__3D_', regex: /^\+=/ },    { type: 'TOKEN__2D__3D_', regex: /^-=/ },    { type: 'TOKEN__3C__3C__3D_', regex: /^<<=/ },    { type: 'TOKEN__3E__3E__3D_', regex: /^>>=/ },    { type: 'TOKEN__26__3D_', regex: /^&=/ },    { type: 'TOKEN__5E__3D_', regex: /^\^=/ },    { type: 'TOKEN__7C__3D_', regex: /^\|=/ },    { type: 'TOKEN__3F_', regex: /^\?/ },    { type: 'TOKEN__7C__7C_', regex: /^\|\|/ },    { type: 'TOKEN__26__26_', regex: /^&&/ },    { type: 'TOKEN__7C_', regex: /^\|/ },    { type: 'TOKEN__5E_', regex: /^\^/ },    { type: 'TOKEN__26_', regex: /^&/ },    { type: 'TOKEN__3D__3D_', regex: /^==/ },    { type: 'TOKEN__21__3D_', regex: /^!=/ },    { type: 'TOKEN__3C_', regex: /^</ },    { type: 'TOKEN__3E_', regex: /^>/ },    { type: 'TOKEN__3C__3D_', regex: /^<=/ },    { type: 'TOKEN__3E__3D_', regex: /^>=/ },    { type: 'TOKEN__3C__3C_', regex: /^<</ },    { type: 'TOKEN__3E__3E_', regex: /^>>/ },    { type: 'TOKEN__2B_', regex: /^\+/ },    { type: 'TOKEN__2D_', regex: /^-/ },    { type: 'TOKEN__2F_', regex: /^\// },    { type: 'TOKEN__25_', regex: /^%/ },    { type: 'TOKEN__2B__2B_', regex: /^\+\+/ },    { type: 'TOKEN__2D__2D_', regex: /^--/ },    { type: 'TOKEN_sizeof', regex: /^sizeof/ },    { type: 'TOKEN__7E_', regex: /^~/ },    { type: 'TOKEN__21_', regex: /^!/ },    { type: 'TOKEN__2D__3E_', regex: /^->/ },    { type: 'Identifier', regex: /^(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*/ },    { type: 'IntegerConstant', regex: /^(?:[1-9](?:[0-9])*|0(?:[0-7])*|0[xX](?:[0-9a-fA-F])+|0[bB](?:[01])+)/ },    { type: 'FloatingConstant', regex: /^(?:(?:(?:[0-9])+\.(?:[0-9])*(?:[eE](?:[+-])?(?:[0-9])+)?(?:[fFlL])?|\.(?:[0-9])+(?:[eE](?:[+-])?(?:[0-9])+)?(?:[fFlL])?|(?:[0-9])+[eE](?:[+-])?(?:[0-9])+(?:[fFlL])?|(?:[0-9])+[fFlL])|(?:0[xX](?:(?:[0-9a-fA-F])+\.(?:[0-9a-fA-F])*|\.(?:[0-9a-fA-F])+|(?:[0-9a-fA-F])+)[pP](?:[+-])?(?:[0-9])+(?:[fFlL])?|0[xX](?:(?:[0-9a-fA-F])+\.(?:[0-9a-fA-F])*|\.(?:[0-9a-fA-F])+|(?:[0-9a-fA-F])+)[pP](?:[+-])?(?:[0-9])+(?:[fFlL])?))/ },    { type: 'CharacterConstant', regex: /^(?:\\\\)?'(?:(?:[!-~]| |(?:\\['"?nrtv]|\\[0-7](?:[0-7])?(?:[0-7])?|\\[xX](?:[0-9a-fA-F])+|(?:\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]|\\U[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]))))+'/ },    { type: 'StringLiteral', regex: /^"(?:(?:[#-[!]|[\u005d-\u007e]| |\u0009|(?:\\['"?nrtv]|\\[0-7](?:[0-7])?(?:[0-7])?|\\[xX](?:[0-9a-fA-F])+|(?:\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]|\\U[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]))))*"/ },    { type: 'skip', regex: /^(?:[\u0009\u000A\u000D\u0020]+|\/\/[^\n]*\n?|\/\*(?!\s*ws\s*:)[\s\S]*?\*\/)+/, skip: true },    { type: 'Comment', regex: /^(?:\/\*(?:(?:[\s\S])*)\*\/|\/\/(?:[^\\n\\r])*(?:(?:\u000a|\u000d|\u000d\u000a)))/ },    { type: 'PreprocessingDirective', regex: /^(?:(?:#(?:(?: |\u0009|\u000b|\u000c))*define(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|\((?:(?: |\u0009|\u000b|\u000c))*(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?:(?:(?: |\u0009|\u000b|\u000c))*,(?:(?: |\u0009|\u000b|\u000c))*(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*))*(?:(?:(?:(?: |\u0009|\u000b|\u000c))*,(?:(?: |\u0009|\u000b|\u000c))*\.\.\.))?|\.\.\.))?(?:(?: |\u0009|\u000b|\u000c))*\)(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)))|#(?:(?: |\u0009|\u000b|\u000c))*undef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*include(?:(?: |\u0009|\u000b|\u000c))+(?:<(?:(?:[\u0020-\u003d]|[\u003f-\u007e]|\u0009))+>|"(?:(?:[\u0020-\u0021]|[\u0023-\u007e]|\u0009))*")(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*line(?:(?: |\u0009|\u000b|\u000c))+(?:[1-9](?:[0-9])*|0(?:[0-7])*|0[xX](?:[0-9a-fA-F])+|0[bB](?:[01])+)(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:<(?:(?:[\u0020-\u003d]|[\u003f-\u007e]|\u0009))+>|"(?:(?:[\u0020-\u0021]|[\u0023-\u007e]|\u0009))*")))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*error(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*pragma(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)))|(?:#(?:(?: |\u0009|\u000b|\u000c))*if(?:(?: |\u0009|\u000b|\u000c))+(?:(?:(?:[\u0020-\u007e]|\u0009))+)?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*ifdef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*ifndef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd])|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)))|#(?:(?: |\u0009|\u000b|\u000c))*elif(?:(?: |\u0009|\u000b|\u000c))+(?:(?:(?:[\u0020-\u007e]|\u0009))+)?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*else(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*endif(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a))|#(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)))/ },    ];
  }

  isTemplateSpanPattern(pos, kind) {
    // Deterministic scan to avoid regex escaping issues in generated code.
    if (this.input[pos] !== '}') return false;
    const BACKTICK = String.fromCharCode(96);
    const max = Math.min(this.input.length, pos + 256);
    let i = pos + 1;
    while (i < max) {
      const ch = this.input[i];
      const next = this.input[i + 1];

      if (ch === '\\') {
        i += 2;
        continue;
      }

      if (ch === '$' && next === '{') {
        return kind === 'TemplateMiddle';
      }

      if (ch === BACKTICK) {
        return kind === 'TemplateTail';
      }

      i++;
    }
    return false;
  }

  enterTemplateSpan() {
    this.templateDepth++;
  }

  exitTemplateSpan() {
    if (this.templateDepth > 0) {
      this.templateDepth--;
    }
  }
  
  tokenize() {
    while (this.position < this.input.length) {
      let bestPattern = null;
      let bestMatch = null;
      const candidates = [];

      const isGenericNameType = (type) => (
        type === 'Name' || type === 'NameChar' || type === 'NameStartChar'
      );

      for (const pattern of this.tokenPatterns) {
        // Template middle/tail tokens are context-sensitive and must only
        // be considered while lexing inside an active template expression.
        if ((pattern.type === 'TemplateMiddle' || pattern.type === 'TemplateTail') && this.templateDepth === 0) {
          continue;
        }

        const regex = pattern.regex;
        const match = this.input.substring(this.position).match(regex);

        if (match && match.index === 0 && match[0].length > 0) {
          let effectivePattern = pattern;
          // When parsing template expressions, disambiguate closing brace as template span boundary.
          if (this.templateDepth > 0 && pattern.type === 'TOKEN__7D_') {
            if (this.isTemplateSpanPattern(this.position, 'TemplateMiddle')) {
              effectivePattern = { ...pattern, type: 'TemplateMiddle' };
            } else if (this.isTemplateSpanPattern(this.position, 'TemplateTail')) {
              effectivePattern = { ...pattern, type: 'TemplateTail' };
            }
          }

          candidates.push({ pattern: effectivePattern, match });
          if (!bestMatch
              || match[0].length > bestMatch[0].length
              || (match[0].length === bestMatch[0].length && effectivePattern.skip && !bestPattern.skip)
              || (match[0].length === bestMatch[0].length
                  && bestPattern
                  && isGenericNameType(bestPattern.type)
                  && !isGenericNameType(effectivePattern.type))) {
            bestPattern = effectivePattern;
            bestMatch = match;
          }
        }
      }

      // Inside character classes, prefer Char/CharCode/CharRange-like tokens
      // over generic global terminals such as '?>' that can overmatch.
      if (this.charClassDepth > 0 && candidates.length > 0) {
        const preferredTypes = new Set(['CharCodeRange', 'CharRange', 'CharCode', 'Char', 'TOKEN__5D_']);
        const preferred = candidates.filter(c => preferredTypes.has(c.pattern.type));
        if (preferred.length > 0) {
          let localBest = preferred[0];
          for (const c of preferred) {
            if (c.match[0].length > localBest.match[0].length) {
              localBest = c;
            }
          }
          bestPattern = localBest.pattern;
          bestMatch = localBest.match;
        }
      }

      // If current input starts with whitespace and a skip token is available,
      // prefer skipping whitespace first instead of consuming it as grammar data.
      if (candidates.length > 0 && /^\s/.test(this.input.substring(this.position, this.position + 1))) {
        const skipCandidates = candidates.filter(c => c.pattern.skip);
        if (skipCandidates.length > 0) {
          let localBest = skipCandidates[0];
          for (const c of skipCandidates) {
            if (c.match[0].length > localBest.match[0].length) {
              localBest = c;
            }
          }
          bestPattern = localBest.pattern;
          bestMatch = localBest.match;
        }
      }

      if (!bestMatch) {
        throw new Error(`Unexpected character at position ${this.position}: '${this.input[this.position]}'`);
      }

      if (!bestPattern.skip) {
        const matchedToken = {
          type: bestPattern.type,
          value: bestMatch[0],
          start: this.position,
          end: this.position + bestMatch[0].length
        };
        this.tokens.push(matchedToken);

        if (bestPattern.type === 'TOKEN__5B_' || bestPattern.type === 'TOKEN__5B__5E_') {
          this.charClassDepth++;
        } else if (bestPattern.type === 'TOKEN__5D_' && this.charClassDepth > 0) {
          this.charClassDepth--;
        } else if (bestPattern.type === 'TemplateHead') {
          this.enterTemplateSpan();
        } else if (bestPattern.type === 'TemplateTail') {
          this.exitTemplateSpan();
        }
      }

      this.position += bestMatch[0].length;
    }
    
    // Add EOF token
    this.tokens.push({
      type: 'EOF',
      value: '',
      start: this.position,
      end: this.position
    });
    
    return this.tokens;
  }
}

class Parser {
  constructor(input, eventHandler = null) {
    this.lexer = new Lexer(input);
    this.tokens = this.lexer.tokenize();
    this.position = 0;
    this.errors = [];
    this.eventHandler = eventHandler;
  }
  
  peek(offset = 0) {
    return this.tokens[this.position + offset];
  }
  
  consume(expectedType) {
    const token = this.peek();
    if (!token || token.type !== expectedType) {
      this.errors.push({
        expected: expectedType,
        found: token ? token.type : 'EOF',
        position: this.position
      });
      throw new Error(`Expected '${expectedType}', got '${token ? token.type : 'EOF'}'`);
    }
    if (this.eventHandler && typeof this.eventHandler.terminal === 'function') {
      this.eventHandler.terminal(expectedType, token.value, this.position);
    }
    this.position++;
    return token;
  }
  
  match(expectedType) {
    const token = this.peek();
    if (token && token.type === expectedType) {
      if (this.eventHandler && typeof this.eventHandler.terminal === 'function') {
        this.eventHandler.terminal(expectedType, token.value, this.position);
      }
      this.position++;
      return true;
    }
    return false;
  }

  markEventState() {
    if (this.eventHandler && typeof this.eventHandler.checkpoint === 'function') {
      return this.eventHandler.checkpoint();
    }
    return null;
  }

  restoreEventState(mark) {
    if (mark !== null && this.eventHandler && typeof this.eventHandler.restore === 'function') {
      this.eventHandler.restore(mark);
    }
  }
  
  getErrorMessage() {
    if (this.errors.length === 0) return 'No errors';
    const err = this.errors[0];
    return `Syntax error: expected ${err.expected}, got ${err.found}`;
  }
  parse() {
    const result = this.parsetranslationUnit();
    const next = this.peek();
    if (!next && this.position === this.tokens.length) {
      return result;
    }
    if (!next || next.type !== 'EOF') {
      throw new Error(`Unexpected token at end: ${next ? next.type : 'EOF(consumed)'}`);
    }
    return result;
  }
  parsetranslationUnit() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('translationUnit', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetranslationUnitItem();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one translationUnitItem');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('translationUnit', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('translationUnit', this.position);
        }
      }
    }
  }
  parsetranslationUnitItem() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('translationUnitItem', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseexternalDeclaration();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('PreprocessingDirective');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Comment');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('translationUnitItem', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('translationUnitItem', this.position);
        }
      }
    }
  }
  parseexternalDeclaration() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('externalDeclaration', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsefunctionDefinition();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclaration();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('externalDeclaration', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('externalDeclaration', this.position);
        }
      }
    }
  }
  parsefunctionDefinition() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('functionDefinition', this.position);
    }
    let __ok = false;
    try {
    // Optional: try parsing declarationSpecifiers
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclarationSpecifiers();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parsedeclarator();
    // Optional: try parsing declarationList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclarationList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parsecompoundStatement();

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('functionDefinition', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('functionDefinition', this.position);
        }
      }
    }
  }
  parsedeclaration() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declaration', this.position);
    }
    let __ok = false;
    try {
    this.parsedeclarationSpecifiers();
    // Optional: try parsing initDeclaratorList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseinitDeclaratorList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declaration', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declaration', this.position);
        }
      }
    }
  }
  parsedeclarationList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationList', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclaration();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one declaration');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declarationList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declarationList', this.position);
        }
      }
    }
  }
  parsedeclarationSpecifiers() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifiers', this.position);
    }
    let __ok = false;
    try {
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclarationSpecifierPrefix();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    this.parsetypeSpecifierSequence();
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclarationSpecifierSuffix();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declarationSpecifiers', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declarationSpecifiers', this.position);
        }
      }
    }
  }
  parsedeclarationSpecifierPrefix() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifierPrefix', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsestorageClassSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsetypeQualifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declarationSpecifierPrefix', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declarationSpecifierPrefix', this.position);
        }
      }
    }
  }
  parsedeclarationSpecifierSuffix() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifierSuffix', this.position);
    }
    let __ok = false;
    try {
    this.parsetypeQualifier();

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declarationSpecifierSuffix', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declarationSpecifierSuffix', this.position);
        }
      }
    }
  }
  parsestorageClassSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('storageClassSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_auto');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_register');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_static');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_extern');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_typedef');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 5 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('storageClassSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('storageClassSpecifier', this.position);
        }
      }
    }
  }
  parsetypeSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsebuiltinTypeSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsenamedTypeSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typeSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typeSpecifier', this.position);
        }
      }
    }
  }
  parsetypeSpecifierSequence() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeSpecifierSequence', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsebuiltinTypeSpecifier();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one builtinTypeSpecifier');
    }
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsenamedTypeSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typeSpecifierSequence', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typeSpecifierSequence', this.position);
        }
      }
    }
  }
  parsebuiltinTypeSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('builtinTypeSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_void');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_char');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_short');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_int');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_long');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_float');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_double');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_signed');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_unsigned');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 9 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('builtinTypeSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('builtinTypeSpecifier', this.position);
        }
      }
    }
  }
  parsenamedTypeSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('namedTypeSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsestructOrUnionSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseenumSpecifier();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsetypedefName();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('namedTypeSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('namedTypeSpecifier', this.position);
        }
      }
    }
  }
  parsetypeQualifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeQualifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_const');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_volatile');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typeQualifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typeQualifier', this.position);
        }
      }
    }
  }
  parsestructOrUnionSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structOrUnionSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsestructOrUnion();
    if (this.match('Identifier')) { /* optional token matched */ }
    this.consume('TOKEN__7B_');
    this.parsestructDeclarationList();
    this.consume('TOKEN__7D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsestructOrUnion();
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structOrUnionSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structOrUnionSpecifier', this.position);
        }
      }
    }
  }
  parsestructOrUnion() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structOrUnion', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_struct');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_union');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structOrUnion', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structOrUnion', this.position);
        }
      }
    }
  }
  parsestructDeclarationList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclarationList', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsestructDeclaration();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one structDeclaration');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structDeclarationList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structDeclarationList', this.position);
        }
      }
    }
  }
  parseinitDeclaratorList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initDeclaratorList', this.position);
    }
    let __ok = false;
    try {
    this.parseinitDeclarator();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parseinitDeclarator();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('initDeclaratorList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('initDeclaratorList', this.position);
        }
      }
    }
  }
  parseinitDeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initDeclarator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclarator();
    this.consume('TOKEN__3D_');
    this.parseinitializer();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclarator();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('initDeclarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('initDeclarator', this.position);
        }
      }
    }
  }
  parsestructDeclaration() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclaration', this.position);
    }
    let __ok = false;
    try {
    this.parsespecifierQualifierList();
    this.parsestructDeclaratorList();
    this.consume('TOKEN__3B_');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structDeclaration', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structDeclaration', this.position);
        }
      }
    }
  }
  parsespecifierQualifierList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('specifierQualifierList', this.position);
    }
    let __ok = false;
    try {
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetypeQualifier();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    this.parsetypeSpecifierSequence();
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetypeQualifier();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('specifierQualifierList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('specifierQualifierList', this.position);
        }
      }
    }
  }
  parsestructDeclaratorList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclaratorList', this.position);
    }
    let __ok = false;
    try {
    this.parsestructDeclarator();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parsestructDeclarator();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structDeclaratorList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structDeclaratorList', this.position);
        }
      }
    }
  }
  parsestructDeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclarator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclarator();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    // Optional: try parsing declarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedeclarator();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3A_');
    this.parseconstantExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('structDeclarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('structDeclarator', this.position);
        }
      }
    }
  }
  parseenumSpecifier() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumSpecifier', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_enum');
    if (this.match('Identifier')) { /* optional token matched */ }
    this.consume('TOKEN__7B_');
    this.parseenumeratorList();
    this.consume('TOKEN__7D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_enum');
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('enumSpecifier', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('enumSpecifier', this.position);
        }
      }
    }
  }
  parseenumeratorList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumeratorList', this.position);
    }
    let __ok = false;
    try {
    this.parseenumerator();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parseenumerator();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('enumeratorList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('enumeratorList', this.position);
        }
      }
    }
  }
  parseenumerator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumerator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
    this.consume('TOKEN__3D_');
    this.parseconstantExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('enumerator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('enumerator', this.position);
        }
      }
    }
  }
  parsedeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarator', this.position);
    }
    let __ok = false;
    try {
    // Optional: try parsing pointer
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsepointer();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parsedirectDeclarator();

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('declarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('declarator', this.position);
        }
      }
    }
  }
  parsedirectDeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclarator', this.position);
    }
    let __ok = false;
    try {
    this.parsedirectDeclaratorBase();
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedirectDeclaratorSuffix();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('directDeclarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('directDeclarator', this.position);
        }
      }
    }
  }
  parsedirectDeclaratorBase() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclaratorBase', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    this.parsedeclarator();
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('directDeclaratorBase', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('directDeclaratorBase', this.position);
        }
      }
    }
  }
  parsedirectDeclaratorSuffix() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclaratorSuffix', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__5B_');
    // Optional: try parsing constantExpression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseconstantExpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__5D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    this.parseparameterTypeList();
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    // Optional: try parsing identifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseidentifierList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('directDeclaratorSuffix', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('directDeclaratorSuffix', this.position);
        }
      }
    }
  }
  parsepointer() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('pointer', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2A_');
    // Optional: try parsing typeQualifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetypeQualifierList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parsepointer();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2A_');
    // Optional: try parsing typeQualifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetypeQualifierList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('pointer', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('pointer', this.position);
        }
      }
    }
  }
  parsetypeQualifierList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeQualifierList', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsetypeQualifier();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one typeQualifier');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typeQualifierList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typeQualifierList', this.position);
        }
      }
    }
  }
  parseparameterTypeList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterTypeList', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseparameterList();
    this.consume('TOKEN__2C_');
    this.consume('TOKEN__2E__2E__2E_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseparameterList();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('parameterTypeList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('parameterTypeList', this.position);
        }
      }
    }
  }
  parseparameterList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterList', this.position);
    }
    let __ok = false;
    try {
    this.parseparameterDeclaration();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parseparameterDeclaration();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('parameterList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('parameterList', this.position);
        }
      }
    }
  }
  parseparameterDeclaration() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterDeclaration', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclarationSpecifiers();
    this.parsedeclarator();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclarationSpecifiers();
    // Optional: try parsing abstractDeclarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseabstractDeclarator();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('parameterDeclaration', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('parameterDeclaration', this.position);
        }
      }
    }
  }
  parseidentifierList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('identifierList', this.position);
    }
    let __ok = false;
    try {
    this.consume('Identifier');
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.consume('Identifier');
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('identifierList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('identifierList', this.position);
        }
      }
    }
  }
  parseinitializer() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initializer', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseassignmentExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__7B_');
    this.parseinitializerList();
    this.consume('TOKEN__7D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__7B_');
    this.parseinitializerList();
    this.consume('TOKEN__2C_');
    this.consume('TOKEN__7D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('initializer', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('initializer', this.position);
        }
      }
    }
  }
  parseinitializerList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initializerList', this.position);
    }
    let __ok = false;
    try {
    // Optional: try parsing designation
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedesignation();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parseinitializer();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    // Optional: try parsing designation
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedesignation();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parseinitializer();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('initializerList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('initializerList', this.position);
        }
      }
    }
  }
  parsedesignation() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designation', this.position);
    }
    let __ok = false;
    try {
    this.parsedesignatorList();
    this.consume('TOKEN__3D_');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('designation', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('designation', this.position);
        }
      }
    }
  }
  parsedesignatorList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designatorList', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedesignator();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one designator');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('designatorList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('designatorList', this.position);
        }
      }
    }
  }
  parsedesignator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__5B_');
    this.parseconstantExpression();
    this.consume('TOKEN__5D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2E_');
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('designator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('designator', this.position);
        }
      }
    }
  }
  parsetypeName() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeName', this.position);
    }
    let __ok = false;
    try {
    this.parsespecifierQualifierList();
    // Optional: try parsing abstractDeclarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseabstractDeclarator();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typeName', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typeName', this.position);
        }
      }
    }
  }
  parseabstractDeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('abstractDeclarator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsepointer();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    // Optional: try parsing pointer
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsepointer();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.parsedirectAbstractDeclarator();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('abstractDeclarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('abstractDeclarator', this.position);
        }
      }
    }
  }
  parsedirectAbstractDeclarator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directAbstractDeclarator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    this.parseabstractDeclarator();
    this.consume('TOKEN__29_');
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedirectAbstractDeclaratorSuffix();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsedirectAbstractDeclaratorSuffix();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one directAbstractDeclaratorSuffix');
    }
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('directAbstractDeclarator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('directAbstractDeclarator', this.position);
        }
      }
    }
  }
  parsedirectAbstractDeclaratorSuffix() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directAbstractDeclaratorSuffix', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__5B_');
    // Optional: try parsing constantExpression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseconstantExpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__5D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    // Optional: try parsing parameterTypeList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseparameterTypeList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('directAbstractDeclaratorSuffix', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('directAbstractDeclaratorSuffix', this.position);
        }
      }
    }
  }
  parsetypedefName() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typedefName', this.position);
    }
    let __ok = false;
    try {
    this.consume('Identifier');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('typedefName', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('typedefName', this.position);
        }
      }
    }
  }
  parsestatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('statement', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parselabeledStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseexpressionStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsecompoundStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseselectionStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseiterationStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsejumpStatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Comment');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 7 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('statement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('statement', this.position);
        }
      }
    }
  }
  parselabeledStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('labeledStatement', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
    this.consume('TOKEN__3A_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_case');
    this.parseconstantExpression();
    this.consume('TOKEN__3A_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_default');
    this.consume('TOKEN__3A_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('labeledStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('labeledStatement', this.position);
        }
      }
    }
  }
  parseexpressionStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('expressionStatement', this.position);
    }
    let __ok = false;
    try {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('expressionStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('expressionStatement', this.position);
        }
      }
    }
  }
  parsecompoundStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('compoundStatement', this.position);
    }
    let __ok = false;
    try {
    this.consume('TOKEN__7B_');
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseblockItem();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    this.consume('TOKEN__7D_');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('compoundStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('compoundStatement', this.position);
        }
      }
    }
  }
  parseblockItem() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('blockItem', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsedeclaration();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('blockItem', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('blockItem', this.position);
        }
      }
    }
  }
  parsestatementList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('statementList', this.position);
    }
    let __ok = false;
    try {
    let count = 0;
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsestatement();
        if (this.position === savePos) break;
        count++;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }
    if (count === 0) {
      throw new Error('Expected at least one statement');
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('statementList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('statementList', this.position);
        }
      }
    }
  }
  parseselectionStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('selectionStatement', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_if');
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
    this.parsestatement();
    this.consume('TOKEN_else');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_if');
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_switch');
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 3 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('selectionStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('selectionStatement', this.position);
        }
      }
    }
  }
  parseiterationStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('iterationStatement', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_while');
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_do');
    this.parsestatement();
    this.consume('TOKEN_while');
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
    this.consume('TOKEN__3B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_for');
    this.consume('TOKEN__28_');
    this.parsedeclaration();
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__29_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_for');
    this.consume('TOKEN__28_');
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__29_');
    this.parsestatement();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 4 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('iterationStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('iterationStatement', this.position);
        }
      }
    }
  }
  parsejumpStatement() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('jumpStatement', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_goto');
    this.consume('Identifier');
    this.consume('TOKEN__3B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_continue');
    this.consume('TOKEN__3B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_break');
    this.consume('TOKEN__3B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_return');
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseexpression();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__3B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 4 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('jumpStatement', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('jumpStatement', this.position);
        }
      }
    }
  }
  parseexpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('expression', this.position);
    }
    let __ok = false;
    try {
    this.parseassignmentExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parseassignmentExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('expression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('expression', this.position);
        }
      }
    }
  }
  parseassignmentExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('assignmentExpression', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseconditionalExpression();
    this.parseassignmentOperator();
    this.parseassignmentExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseconditionalExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('assignmentExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('assignmentExpression', this.position);
        }
      }
    }
  }
  parseassignmentOperator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('assignmentOperator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2A__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2F__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__25__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2B__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2D__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__3C__3C__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__3E__3E__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__26__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__5E__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__7C__3D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 11 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('assignmentOperator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('assignmentOperator', this.position);
        }
      }
    }
  }
  parseconditionalExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('conditionalExpression', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parselogicalOrExpression();
    this.consume('TOKEN__3F_');
    this.parseexpression();
    this.consume('TOKEN__3A_');
    this.parseconditionalExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parselogicalOrExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('conditionalExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('conditionalExpression', this.position);
        }
      }
    }
  }
  parseconstantExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('constantExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseconditionalExpression();

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('constantExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('constantExpression', this.position);
        }
      }
    }
  }
  parselogicalOrExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('logicalOrExpression', this.position);
    }
    let __ok = false;
    try {
    this.parselogicalAndExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__7C__7C_');
    this.parselogicalAndExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('logicalOrExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('logicalOrExpression', this.position);
        }
      }
    }
  }
  parselogicalAndExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('logicalAndExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseinclusiveOrExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__26__26_');
    this.parseinclusiveOrExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('logicalAndExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('logicalAndExpression', this.position);
        }
      }
    }
  }
  parseinclusiveOrExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('inclusiveOrExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseexclusiveOrExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__7C_');
    this.parseexclusiveOrExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('inclusiveOrExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('inclusiveOrExpression', this.position);
        }
      }
    }
  }
  parseexclusiveOrExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('exclusiveOrExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseandExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__5E_');
    this.parseandExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('exclusiveOrExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('exclusiveOrExpression', this.position);
        }
      }
    }
  }
  parseandExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('andExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseequalityExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__26_');
    this.parseequalityExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('andExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('andExpression', this.position);
        }
      }
    }
  }
  parseequalityExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('equalityExpression', this.position);
    }
    let __ok = false;
    try {
    this.parserelationalExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3D__3D_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__21__3D_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { throw new Error('No group alternative matched'); }
    }
    this.parserelationalExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('equalityExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('equalityExpression', this.position);
        }
      }
    }
  }
  parserelationalExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('relationalExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseshiftExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3C_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3E_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3C__3D_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3E__3D_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { throw new Error('No group alternative matched'); }
    }
    this.parseshiftExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('relationalExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('relationalExpression', this.position);
        }
      }
    }
  }
  parseshiftExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('shiftExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseadditiveExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3C__3C_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__3E__3E_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { throw new Error('No group alternative matched'); }
    }
    this.parseadditiveExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('shiftExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('shiftExpression', this.position);
        }
      }
    }
  }
  parseadditiveExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('additiveExpression', this.position);
    }
    let __ok = false;
    try {
    this.parsemultiplicativeExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__2B_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__2D_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { throw new Error('No group alternative matched'); }
    }
    this.parsemultiplicativeExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('additiveExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('additiveExpression', this.position);
        }
      }
    }
  }
  parsemultiplicativeExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('multiplicativeExpression', this.position);
    }
    let __ok = false;
    try {
    this.parsecastExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__2A_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__2F_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        try {
    this.consume('TOKEN__25_');
          _matchedAlt = true;
        } catch (e) {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { throw new Error('No group alternative matched'); }
    }
    this.parsecastExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('multiplicativeExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('multiplicativeExpression', this.position);
        }
      }
    }
  }
  parsecastExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('castExpression', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseunaryExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    this.parsetypeName();
    this.consume('TOKEN__29_');
    this.parsecastExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 2 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('castExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('castExpression', this.position);
        }
      }
    }
  }
  parseunaryExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('unaryExpression', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parsepostfixExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Comment');
    this.parseunaryExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2B__2B_');
    this.parseunaryExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2D__2D_');
    this.parseunaryExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseunaryOperator();
    this.parsecastExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_sizeof');
    this.parseunaryExpression();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN_sizeof');
    this.consume('TOKEN__28_');
    this.parsetypeName();
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 7 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('unaryExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('unaryExpression', this.position);
        }
      }
    }
  }
  parseunaryOperator() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('unaryOperator', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__26_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2A_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__7E_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__21_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 6 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('unaryOperator', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('unaryOperator', this.position);
        }
      }
    }
  }
  parsepostfixExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('postfixExpression', this.position);
    }
    let __ok = false;
    try {
    this.parseprimaryExpression();
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parsepostfixSuffix();
        if (this.position === savePos) break;
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('postfixExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('postfixExpression', this.position);
        }
      }
    }
  }
  parsepostfixSuffix() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('postfixSuffix', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__5B_');
    this.parseexpression();
    this.consume('TOKEN__5D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    // Optional: try parsing argumentExpressionList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      try {
        this.parseargumentExpressionList();
      } catch(e) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2E_');
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2D__3E_');
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2B__2B_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__2D__2D_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 6 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('postfixSuffix', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('postfixSuffix', this.position);
        }
      }
    }
  }
  parseprimaryExpression() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('primaryExpression', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.parseconstant();
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('StringLiteral');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('TOKEN__28_');
    this.parseexpression();
    this.consume('TOKEN__29_');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 4 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('primaryExpression', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('primaryExpression', this.position);
        }
      }
    }
  }
  parseargumentExpressionList() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('argumentExpressionList', this.position);
    }
    let __ok = false;
    try {
    this.parseassignmentExpression();
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      try {
    this.consume('TOKEN__2C_');
    this.parseassignmentExpression();
      } catch (e) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('argumentExpressionList', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('argumentExpressionList', this.position);
        }
      }
    }
  }
  parseconstant() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('constant', this.position);
    }
    let __ok = false;
    try {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('IntegerConstant');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('CharacterConstant');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('FloatingConstant');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      try {
    this.consume('Identifier');
        _matched = true;
      } catch (e) {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      throw new Error(`Expected one of: 4 alternatives`);
    }

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('constant', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('constant', this.position);
        }
      }
    }
  }
  parseIgnore() {
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('Ignore', this.position);
    }
    let __ok = false;
    try {
    this.consume('WhiteSpace');

      __ok = true;
    } finally {
      if (this.eventHandler) {
        if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
          this.eventHandler.endNonterminal('Ignore', this.position);
        }
        if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
          this.eventHandler.abortNonterminal('Ignore', this.position);
        }
      }
    }
  }
}

module.exports = Parser;
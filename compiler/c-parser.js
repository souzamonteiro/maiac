class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.tokens = [];
    this.charClassDepth = 0;
    this.templateDepth = 0;
    this.templateBraceDepthStack = [];
    this.tokenPatterns = [    { type: 'TOKEN__3B_', regex: /^;/ },    { type: 'TOKEN_auto', regex: /^auto/ },    { type: 'TOKEN_register', regex: /^register/ },    { type: 'TOKEN_static', regex: /^static/ },    { type: 'TOKEN_extern', regex: /^extern/ },    { type: 'TOKEN_typedef', regex: /^typedef/ },    { type: 'TOKEN_void', regex: /^void/ },    { type: 'TOKEN_char', regex: /^char/ },    { type: 'TOKEN_short', regex: /^short/ },    { type: 'TOKEN_int', regex: /^int/ },    { type: 'TOKEN_long', regex: /^long/ },    { type: 'TOKEN_float', regex: /^float/ },    { type: 'TOKEN_double', regex: /^double/ },    { type: 'TOKEN_signed', regex: /^signed/ },    { type: 'TOKEN_unsigned', regex: /^unsigned/ },    { type: 'TOKEN_const', regex: /^const/ },    { type: 'TOKEN_volatile', regex: /^volatile/ },    { type: 'TOKEN__7B_', regex: /^\{/ },    { type: 'TOKEN__7D_', regex: /^\}/ },    { type: 'TOKEN_struct', regex: /^struct/ },    { type: 'TOKEN_union', regex: /^union/ },    { type: 'TOKEN__2C_', regex: /^,/ },    { type: 'TOKEN__3D_', regex: /^=/ },    { type: 'TOKEN__3A_', regex: /^:/ },    { type: 'TOKEN_enum', regex: /^enum/ },    { type: 'TOKEN__28_', regex: /^\(/ },    { type: 'TOKEN__29_', regex: /^\)/ },    { type: 'TOKEN__5B_', regex: /^\[/ },    { type: 'TOKEN__5D_', regex: /^\]/ },    { type: 'TOKEN__2A_', regex: /^\*/ },    { type: 'TOKEN__2E__2E__2E_', regex: /^\.\.\./ },    { type: 'TOKEN__2E_', regex: /^\./ },    { type: 'TOKEN_case', regex: /^case/ },    { type: 'TOKEN_default', regex: /^default/ },    { type: 'TOKEN_if', regex: /^if/ },    { type: 'TOKEN_else', regex: /^else/ },    { type: 'TOKEN_switch', regex: /^switch/ },    { type: 'TOKEN_while', regex: /^while/ },    { type: 'TOKEN_do', regex: /^do/ },    { type: 'TOKEN_for', regex: /^for/ },    { type: 'TOKEN_goto', regex: /^goto/ },    { type: 'TOKEN_continue', regex: /^continue/ },    { type: 'TOKEN_break', regex: /^break/ },    { type: 'TOKEN_return', regex: /^return/ },    { type: 'TOKEN__2A__3D_', regex: /^\*=/ },    { type: 'TOKEN__2F__3D_', regex: /^\/=/ },    { type: 'TOKEN__25__3D_', regex: /^%=/ },    { type: 'TOKEN__2B__3D_', regex: /^\+=/ },    { type: 'TOKEN__2D__3D_', regex: /^-=/ },    { type: 'TOKEN__3C__3C__3D_', regex: /^<<=/ },    { type: 'TOKEN__3E__3E__3D_', regex: /^>>=/ },    { type: 'TOKEN__26__3D_', regex: /^&=/ },    { type: 'TOKEN__5E__3D_', regex: /^\^=/ },    { type: 'TOKEN__7C__3D_', regex: /^\|=/ },    { type: 'TOKEN__3F_', regex: /^\?/ },    { type: 'TOKEN__7C__7C_', regex: /^\|\|/ },    { type: 'TOKEN__26__26_', regex: /^&&/ },    { type: 'TOKEN__7C_', regex: /^\|/ },    { type: 'TOKEN__5E_', regex: /^\^/ },    { type: 'TOKEN__26_', regex: /^&/ },    { type: 'TOKEN__3D__3D_', regex: /^==/ },    { type: 'TOKEN__21__3D_', regex: /^!=/ },    { type: 'TOKEN__3C_', regex: /^</ },    { type: 'TOKEN__3E_', regex: /^>/ },    { type: 'TOKEN__3C__3D_', regex: /^<=/ },    { type: 'TOKEN__3E__3D_', regex: /^>=/ },    { type: 'TOKEN__3C__3C_', regex: /^<</ },    { type: 'TOKEN__3E__3E_', regex: /^>>/ },    { type: 'TOKEN__2B_', regex: /^\+/ },    { type: 'TOKEN__2D_', regex: /^-/ },    { type: 'TOKEN__2F_', regex: /^\// },    { type: 'TOKEN__25_', regex: /^%/ },    { type: 'TOKEN__2B__2B_', regex: /^\+\+/ },    { type: 'TOKEN__2D__2D_', regex: /^--/ },    { type: 'TOKEN_sizeof', regex: /^sizeof/ },    { type: 'TOKEN__7E_', regex: /^~/ },    { type: 'TOKEN__21_', regex: /^!/ },    { type: 'TOKEN__2D__3E_', regex: /^->/ },    { type: 'Identifier', regex: /^(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*/ },    { type: 'IntegerConstant', regex: /^(?:[1-9](?:[0-9])*|0(?:[0-7])*|0[xX](?:[0-9a-fA-F])+|0[bB](?:[01])+)(?:(?:[uU](?:[lL])?|[lL](?:[uU])?))?/ },    { type: 'FloatingConstant', regex: /^(?:(?:(?:[0-9])+\.(?:[0-9])*(?:[eE](?:[+-])?(?:[0-9])+)?(?:[fFlL])?|\.(?:[0-9])+(?:[eE](?:[+-])?(?:[0-9])+)?(?:[fFlL])?|(?:[0-9])+[eE](?:[+-])?(?:[0-9])+(?:[fFlL])?|(?:[0-9])+[fFlL])|(?:0[xX](?:(?:[0-9a-fA-F])+\.(?:[0-9a-fA-F])*|\.(?:[0-9a-fA-F])+|(?:[0-9a-fA-F])+)[pP](?:[+-])?(?:[0-9])+(?:[fFlL])?|0[xX](?:(?:[0-9a-fA-F])+\.(?:[0-9a-fA-F])*|\.(?:[0-9a-fA-F])+|(?:[0-9a-fA-F])+)[pP](?:[+-])?(?:[0-9])+(?:[fFlL])?))/ },    { type: 'CharacterConstant', regex: /^(?:\\\\)?'(?:(?:[\u0020-\u0026]|[\u0028-\u005b]|[\u005d-\u007e]|(?:\\['"?\\abfnrtv]|\\[0-7](?:[0-7])?(?:[0-7])?|\\[xX](?:[0-9a-fA-F])+|(?:\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]|\\U[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]))))+'/ },    { type: 'StringLiteral', regex: /^"(?:(?:[#-[!]|[\u005d-\u007e]|[\u0080-\ud7ff]|(?:[\ue000-\uffff]|[\ud800][\udc00-\udfff]|[\ud801-\udbfe][\udc00-\udfff]|[\udbff][\udc00-\udfff])| |\u0009|(?:\\['"?\\abfnrtv]|\\[0-7](?:[0-7])?(?:[0-7])?|\\[xX](?:[0-9a-fA-F])+|(?:\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]|\\U[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]))))*"/ },    { type: 'skip', regex: /^(?:[\u0009\u000A\u000D\u0020]+|\/\/[^\n]*\n?|\/\*(?!\s*ws\s*:)[\s\S]*?\*\/)+/, skip: true },    { type: 'Comment', regex: /^(?:\/\*(?:(?:[^*]|\*[^/]))*\*\/|\/\/(?:[^\\n\\r])*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S])))/ },    { type: 'PreprocessingDirective', regex: /^(?:(?:#(?:(?: |\u0009|\u000b|\u000c))*define(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|\((?:(?: |\u0009|\u000b|\u000c))*(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?:(?:(?: |\u0009|\u000b|\u000c))*,(?:(?: |\u0009|\u000b|\u000c))*(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*))*(?:(?:(?:(?: |\u0009|\u000b|\u000c))*,(?:(?: |\u0009|\u000b|\u000c))*\.\.\.))?|\.\.\.))?(?:(?: |\u0009|\u000b|\u000c))*\)(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S])))|#(?:(?: |\u0009|\u000b|\u000c))*undef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*include(?:(?: |\u0009|\u000b|\u000c))+(?:<(?:(?:[\u0020-\u003d]|[\u003f-\u007e]|\u0009))+>|"(?:(?:[\u0020-\u0021]|[\u0023-\u007e]|\u0009))*")(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*line(?:(?: |\u0009|\u000b|\u000c))+(?:[1-9](?:[0-9])*|0(?:[0-7])*|0[xX](?:[0-9a-fA-F])+|0[bB](?:[01])+)(?:(?:[uU](?:[lL])?|[lL](?:[uU])?))?(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:<(?:(?:[\u0020-\u003d]|[\u003f-\u007e]|\u0009))+>|"(?:(?:[\u0020-\u0021]|[\u0023-\u007e]|\u0009))*")))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*error(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*pragma(?:(?:(?:(?: |\u0009|\u000b|\u000c))+(?:(?:[\u0020-\u007e]|\u0009))+))?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S])))|(?:#(?:(?: |\u0009|\u000b|\u000c))*if(?:(?: |\u0009|\u000b|\u000c))+(?:(?:(?:[\u0020-\u007e]|\u0009))+)?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*ifdef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*ifndef(?:(?: |\u0009|\u000b|\u000c))+(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))(?:(?:(?:[A-Z]|_|[a-z]|[\u00c0-\u00d6]|[\u00d8-\u00f6]|[\u00f8-\u02ff]|[\u0370-\u037d]|[\u037f-\u1fff]|[\u200c-\u200d]|[\u2070-\u218f]|[\u2c00-\u2fef]|[\u3001-\ud7ff]|[\uf900-\ufdcf]|[\ufdf0-\ufffd]|(?:[\ud800][\udc00-\udfff]|[\ud801-\udb7e][\udc00-\udfff]|[\udb7f][\udc00-\udfff]))|[0-9]|·|[\u0300-\u036f]|[\u203f-\u2040]))*(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S])))|#(?:(?: |\u0009|\u000b|\u000c))*elif(?:(?: |\u0009|\u000b|\u000c))+(?:(?:(?:[\u0020-\u007e]|\u0009))+)?(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*else(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*endif(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S]))|#(?:(?: |\u0009|\u000b|\u000c))*(?:(?:\u000a|\u000d|\u000d\u000a)|(?![\s\S])))/ },    ];
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
    this.templateBraceDepthStack.push(0);
  }

  exitTemplateSpan() {
    if (this.templateDepth > 0) {
      this.templateDepth--;
    }
    if (this.templateBraceDepthStack.length > 0) {
      this.templateBraceDepthStack.pop();
    }
  }

  currentTemplateBraceDepth() {
    return this.templateBraceDepthStack.length === 0
      ? 0
      : this.templateBraceDepthStack[this.templateBraceDepthStack.length - 1];
  }

  incrementTemplateBraceDepth() {
    if (this.templateBraceDepthStack.length > 0) {
      this.templateBraceDepthStack[this.templateBraceDepthStack.length - 1] += 1;
    }
  }

  decrementTemplateBraceDepth() {
    const index = this.templateBraceDepthStack.length - 1;
    if (index >= 0 && this.templateBraceDepthStack[index] > 0) {
      this.templateBraceDepthStack[index] -= 1;
    }
  }
  
  tokenize() {
    while (this.position < this.input.length) {
      let bestPattern = null;
      let bestMatch = null;
      const candidates = [];
      const remainingInput = this.input.substring(this.position);

      const isGenericNameType = (type) => (
        type === 'Name' || type === 'NameChar' || type === 'NameStartChar'
      );

      for (const pattern of this.tokenPatterns) {
        // Template spans are synthesized only when a closing brace ends the
        // active interpolation. Their raw patterns must not consume ordinary
        // braces from nested expressions.
        if (pattern.type === 'TemplateMiddle' || pattern.type === 'TemplateTail') {
          continue;
        }

        const regex = pattern.regex;
        const match = remainingInput.match(regex);

        if (match && match.index === 0 && match[0].length > 0) {
          let effectivePattern = pattern;
          let effectiveMatch = match;
          // When parsing template expressions, disambiguate closing brace as template span boundary.
          if (this.templateDepth > 0
            && pattern.type === 'TOKEN__7D_'
            && this.currentTemplateBraceDepth() === 0) {
            if (this.isTemplateSpanPattern(this.position, 'TemplateMiddle')) {
              const templateMiddle = this.tokenPatterns.find((candidate) => candidate.type === 'TemplateMiddle');
              const templateMatch = templateMiddle
                ? remainingInput.match(templateMiddle.regex)
                : null;
              if (templateMatch && templateMatch.index === 0 && templateMatch[0].length > 0) {
                effectivePattern = templateMiddle;
                effectiveMatch = templateMatch;
              }
            } else if (this.isTemplateSpanPattern(this.position, 'TemplateTail')) {
              const templateTail = this.tokenPatterns.find((candidate) => candidate.type === 'TemplateTail');
              const templateMatch = templateTail
                ? remainingInput.match(templateTail.regex)
                : null;
              if (templateMatch && templateMatch.index === 0 && templateMatch[0].length > 0) {
                effectivePattern = templateTail;
                effectiveMatch = templateMatch;
              }
            }
          }

          candidates.push({ pattern: effectivePattern, match: effectiveMatch });
          if (!bestMatch
              || effectiveMatch[0].length > bestMatch[0].length
              || (effectiveMatch[0].length === bestMatch[0].length && effectivePattern.skip && !bestPattern.skip)
              || (effectiveMatch[0].length === bestMatch[0].length
                  && bestPattern
                  && isGenericNameType(bestPattern.type)
                  && !isGenericNameType(effectivePattern.type))) {
            bestPattern = effectivePattern;
            bestMatch = effectiveMatch;
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
        } else if (bestPattern.type === 'TOKEN__7B_' && this.templateDepth > 0) {
          this.incrementTemplateBraceDepth();
        } else if (bestPattern.type === 'TOKEN__7D_' && this.templateDepth > 0) {
          this.decrementTemplateBraceDepth();
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
    this._lastError = null;
    this.eventHandler = eventHandler;
    this.failureMemo = new Set();
    this.successMemo = new Map();
    this._canMemoSuccess = !eventHandler || typeof eventHandler.appendNode === 'function';
  }
  
  peek(offset = 0) {
    return this.tokens[this.position + offset];
  }
  
  consume(expectedType) {
    const token = this.peek();
    if (!token || token.type !== expectedType) {
      const errObj = {
        expected: expectedType,
        found: token ? token.type : 'EOF',
        position: this.position
      };
      this._lastError = errObj;
      if (this.errors.length === 0 || this.position >= this.errors[this.errors.length - 1].position) {
        this.errors.length = 0;
        this.errors.push(errObj);
      }
      return false;
    }
    if (this.eventHandler && typeof this.eventHandler.terminal === 'function') {
      this.eventHandler.terminal(expectedType, token.value, this.position);
    }
    this.position++;
    return true;
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

  consumeContextual(expectedType) {
    const token = this.peek();
    if (token && token.type === expectedType) {
      return this.consume(expectedType);
    }

    const pattern = this.lexer.tokenPatterns.find((candidate) => candidate.type === expectedType);
    const match = pattern && token ? token.value.match(pattern.regex) : null;
    if (!match || match.index !== 0 || match[0].length !== token.value.length) {
      const errObj = {
        expected: expectedType,
        found: token ? token.type : 'EOF',
        position: this.position
      };
      this._lastError = errObj;
      if (this.errors.length === 0 || this.position >= this.errors[this.errors.length - 1].position) {
        this.errors.length = 0;
        this.errors.push(errObj);
      }
      return false;
    }

    if (this.eventHandler && typeof this.eventHandler.terminal === 'function') {
      this.eventHandler.terminal(token.type, token.value, this.position);
    }
    this.position++;
    return true;
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
    if (!this.parsetranslationUnit()) {
      const err = this._lastError || this.errors[this.errors.length - 1];
      throw new Error(err ? `Expected '${err.expected}', got '${err.found}'` : this.getErrorMessage());
    }
    const next = this.peek();
    if (!next && this.position === this.tokens.length) {
      return undefined;
    }
    if (!next || next.type !== 'EOF') {
      throw new Error(`Unexpected token at end: ${next ? next.type : 'EOF(consumed)'}`);
    }
    return undefined;
  }
  parsetranslationUnit() {
    const __memoStart = this.position;
    const __memoKey = 'translationUnit@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('translationUnit', this.position);
    }
    const __ok = this._parsetranslationUnitBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('translationUnit', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('translationUnit', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetranslationUnitBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsetranslationUnitItem()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parsetranslationUnitItem() {
    const __memoStart = this.position;
    const __memoKey = 'translationUnitItem@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('translationUnitItem', this.position);
    }
    const __ok = this._parsetranslationUnitItemBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('translationUnitItem', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('translationUnitItem', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetranslationUnitItemBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parseexternalDeclaration()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('PreprocessingDirective')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('Comment')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseexternalDeclaration() {
    const __memoStart = this.position;
    const __memoKey = 'externalDeclaration@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('externalDeclaration', this.position);
    }
    const __ok = this._parseexternalDeclarationBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('externalDeclaration', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('externalDeclaration', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseexternalDeclarationBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsefunctionDefinition()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsedeclaration()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsefunctionDefinition() {
    const __memoStart = this.position;
    const __memoKey = 'functionDefinition@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('functionDefinition', this.position);
    }
    const __ok = this._parsefunctionDefinitionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('functionDefinition', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('functionDefinition', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsefunctionDefinitionBody() {
    // Optional: try parsing declarationSpecifiers
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedeclarationSpecifiers()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.parsedeclarator()) { return false; }
    // Optional: try parsing declarationList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedeclarationList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.parsecompoundStatement()) { return false; }

    return true;
  }
  parsedeclaration() {
    const __memoStart = this.position;
    const __memoKey = 'declaration@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declaration', this.position);
    }
    const __ok = this._parsedeclarationBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declaration', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declaration', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclarationBody() {
    if (!this.parsedeclarationSpecifiers()) { return false; }
    // Optional: try parsing initDeclaratorList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseinitDeclaratorList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.consume('TOKEN__3B_')) { return false; }

    return true;
  }
  parsedeclarationList() {
    const __memoStart = this.position;
    const __memoKey = 'declarationList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationList', this.position);
    }
    const __ok = this._parsedeclarationListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declarationList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declarationList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclarationListBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsedeclaration()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parsedeclarationSpecifiers() {
    const __memoStart = this.position;
    const __memoKey = 'declarationSpecifiers@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifiers', this.position);
    }
    const __ok = this._parsedeclarationSpecifiersBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declarationSpecifiers', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declarationSpecifiers', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclarationSpecifiersBody() {
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedeclarationSpecifierPrefix()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }
    if (!this.parsetypeSpecifierSequence()) { return false; }
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedeclarationSpecifierSuffix()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }

    return true;
  }
  parsedeclarationSpecifierPrefix() {
    const __memoStart = this.position;
    const __memoKey = 'declarationSpecifierPrefix@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifierPrefix', this.position);
    }
    const __ok = this._parsedeclarationSpecifierPrefixBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declarationSpecifierPrefix', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declarationSpecifierPrefix', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclarationSpecifierPrefixBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsestorageClassSpecifier()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsetypeQualifier()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsedeclarationSpecifierSuffix() {
    const __memoStart = this.position;
    const __memoKey = 'declarationSpecifierSuffix@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarationSpecifierSuffix', this.position);
    }
    const __ok = this._parsedeclarationSpecifierSuffixBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declarationSpecifierSuffix', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declarationSpecifierSuffix', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclarationSpecifierSuffixBody() {
    if (!this.parsetypeQualifier()) { return false; }

    return true;
  }
  parsestorageClassSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'storageClassSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('storageClassSpecifier', this.position);
    }
    const __ok = this._parsestorageClassSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('storageClassSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('storageClassSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestorageClassSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_auto')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_register')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_static')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN_extern')) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.consume('TOKEN_typedef')) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypeSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'typeSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeSpecifier', this.position);
    }
    const __ok = this._parsetypeSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typeSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typeSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypeSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsebuiltinTypeSpecifier()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsenamedTypeSpecifier()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypeSpecifierSequence() {
    const __memoStart = this.position;
    const __memoKey = 'typeSpecifierSequence@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeSpecifierSequence', this.position);
    }
    const __ok = this._parsetypeSpecifierSequenceBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typeSpecifierSequence', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typeSpecifierSequence', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypeSpecifierSequenceBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsebuiltinTypeSpecifier()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        _ok_1 = false;
      }
    }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsenamedTypeSpecifier()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsebuiltinTypeSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'builtinTypeSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('builtinTypeSpecifier', this.position);
    }
    const __ok = this._parsebuiltinTypeSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('builtinTypeSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('builtinTypeSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsebuiltinTypeSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_void')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_char')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_short')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN_int')) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.consume('TOKEN_long')) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.consume('TOKEN_float')) { _ok_6 = false; }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_7 = true;
    if (!this.consume('TOKEN_double')) { _ok_7 = false; }
      if (_ok_7) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_8 = true;
    if (!this.consume('TOKEN_signed')) { _ok_8 = false; }
      if (_ok_8) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_9 = true;
    if (!this.consume('TOKEN_unsigned')) { _ok_9 = false; }
      if (_ok_9) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsenamedTypeSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'namedTypeSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('namedTypeSpecifier', this.position);
    }
    const __ok = this._parsenamedTypeSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('namedTypeSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('namedTypeSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsenamedTypeSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsestructOrUnionSpecifier()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parseenumSpecifier()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.parsetypedefName()) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypeQualifier() {
    const __memoStart = this.position;
    const __memoKey = 'typeQualifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeQualifier', this.position);
    }
    const __ok = this._parsetypeQualifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typeQualifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typeQualifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypeQualifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_const')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_volatile')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsestructOrUnionSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'structOrUnionSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structOrUnionSpecifier', this.position);
    }
    const __ok = this._parsestructOrUnionSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structOrUnionSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structOrUnionSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructOrUnionSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsestructOrUnion()) { _ok_1 = false; }
      if (_ok_1) {
    if (this.match('Identifier')) { /* optional token matched */ }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__7B_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parsestructDeclarationList()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__7D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsestructOrUnion()) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.consume('Identifier')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsestructOrUnion() {
    const __memoStart = this.position;
    const __memoKey = 'structOrUnion@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structOrUnion', this.position);
    }
    const __ok = this._parsestructOrUnionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structOrUnion', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structOrUnion', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructOrUnionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_struct')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_union')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsestructDeclarationList() {
    const __memoStart = this.position;
    const __memoKey = 'structDeclarationList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclarationList', this.position);
    }
    const __ok = this._parsestructDeclarationListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structDeclarationList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structDeclarationList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructDeclarationListBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsestructDeclaration()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parseinitDeclaratorList() {
    const __memoStart = this.position;
    const __memoKey = 'initDeclaratorList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initDeclaratorList', this.position);
    }
    const __ok = this._parseinitDeclaratorListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('initDeclaratorList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('initDeclaratorList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseinitDeclaratorListBody() {
    if (!this.parseinitDeclarator()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseinitDeclarator()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseinitDeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'initDeclarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initDeclarator', this.position);
    }
    const __ok = this._parseinitDeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('initDeclarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('initDeclarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseinitDeclaratorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsedeclarator()) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__3D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseinitializer()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsedeclarator()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsestructDeclaration() {
    const __memoStart = this.position;
    const __memoKey = 'structDeclaration@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclaration', this.position);
    }
    const __ok = this._parsestructDeclarationBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structDeclaration', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structDeclaration', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructDeclarationBody() {
    if (!this.parsespecifierQualifierList()) { return false; }
    if (!this.parsestructDeclaratorList()) { return false; }
    if (!this.consume('TOKEN__3B_')) { return false; }

    return true;
  }
  parsespecifierQualifierList() {
    const __memoStart = this.position;
    const __memoKey = 'specifierQualifierList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('specifierQualifierList', this.position);
    }
    const __ok = this._parsespecifierQualifierListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('specifierQualifierList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('specifierQualifierList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsespecifierQualifierListBody() {
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsetypeQualifier()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }
    if (!this.parsetypeSpecifierSequence()) { return false; }
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsetypeQualifier()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }

    return true;
  }
  parsestructDeclaratorList() {
    const __memoStart = this.position;
    const __memoKey = 'structDeclaratorList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclaratorList', this.position);
    }
    const __ok = this._parsestructDeclaratorListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structDeclaratorList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structDeclaratorList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructDeclaratorListBody() {
    if (!this.parsestructDeclarator()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parsestructDeclarator()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parsestructDeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'structDeclarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('structDeclarator', this.position);
    }
    const __ok = this._parsestructDeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('structDeclarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('structDeclarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestructDeclaratorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsedeclarator()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    // Optional: try parsing declarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedeclarator()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      if (_ok_2) {
    if (!this.consume('TOKEN__3A_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parseconstantExpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseenumSpecifier() {
    const __memoStart = this.position;
    const __memoKey = 'enumSpecifier@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumSpecifier', this.position);
    }
    const __ok = this._parseenumSpecifierBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('enumSpecifier', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('enumSpecifier', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseenumSpecifierBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_enum')) { _ok_1 = false; }
      if (_ok_1) {
    if (this.match('Identifier')) { /* optional token matched */ }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__7B_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseenumeratorList()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__7D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_enum')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.consume('Identifier')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseenumeratorList() {
    const __memoStart = this.position;
    const __memoKey = 'enumeratorList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumeratorList', this.position);
    }
    const __ok = this._parseenumeratorListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('enumeratorList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('enumeratorList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseenumeratorListBody() {
    if (!this.parseenumerator()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseenumerator()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseenumerator() {
    const __memoStart = this.position;
    const __memoKey = 'enumerator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('enumerator', this.position);
    }
    const __ok = this._parseenumeratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('enumerator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('enumerator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseenumeratorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('Identifier')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__3D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseconstantExpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('Identifier')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsedeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'declarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('declarator', this.position);
    }
    const __ok = this._parsedeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('declarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('declarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedeclaratorBody() {
    // Optional: try parsing pointer
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsepointer()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.parsedirectDeclarator()) { return false; }

    return true;
  }
  parsedirectDeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'directDeclarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclarator', this.position);
    }
    const __ok = this._parsedirectDeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('directDeclarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('directDeclarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedirectDeclaratorBody() {
    if (!this.parsedirectDeclaratorBase()) { return false; }
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedirectDeclaratorSuffix()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }

    return true;
  }
  parsedirectDeclaratorBase() {
    const __memoStart = this.position;
    const __memoKey = 'directDeclaratorBase@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclaratorBase', this.position);
    }
    const __ok = this._parsedirectDeclaratorBaseBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('directDeclaratorBase', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('directDeclaratorBase', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedirectDeclaratorBaseBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('Identifier')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parsedeclarator()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsedirectDeclaratorSuffix() {
    const __memoStart = this.position;
    const __memoKey = 'directDeclaratorSuffix@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directDeclaratorSuffix', this.position);
    }
    const __ok = this._parsedirectDeclaratorSuffixBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('directDeclaratorSuffix', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('directDeclaratorSuffix', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedirectDeclaratorSuffixBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__5B_')) { _ok_1 = false; }
      if (_ok_1) {
    // Optional: try parsing constantExpression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseconstantExpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__5D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parseparameterTypeList()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__28_')) { _ok_3 = false; }
      if (_ok_3) {
    // Optional: try parsing identifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseidentifierList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__29_')) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsepointer() {
    const __memoStart = this.position;
    const __memoKey = 'pointer@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('pointer', this.position);
    }
    const __ok = this._parsepointerBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('pointer', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('pointer', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsepointerBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2A_')) { _ok_1 = false; }
      if (_ok_1) {
    // Optional: try parsing typeQualifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsetypeQualifierList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_1) {
    if (!this.parsepointer()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__2A_')) { _ok_2 = false; }
      if (_ok_2) {
    // Optional: try parsing typeQualifierList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsetypeQualifierList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypeQualifierList() {
    const __memoStart = this.position;
    const __memoKey = 'typeQualifierList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeQualifierList', this.position);
    }
    const __ok = this._parsetypeQualifierListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typeQualifierList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typeQualifierList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypeQualifierListBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsetypeQualifier()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parseparameterTypeList() {
    const __memoStart = this.position;
    const __memoKey = 'parameterTypeList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterTypeList', this.position);
    }
    const __ok = this._parseparameterTypeListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('parameterTypeList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('parameterTypeList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseparameterTypeListBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parseparameterList()) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__2E__2E__2E_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parseparameterList()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseparameterList() {
    const __memoStart = this.position;
    const __memoKey = 'parameterList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterList', this.position);
    }
    const __ok = this._parseparameterListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('parameterList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('parameterList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseparameterListBody() {
    if (!this.parseparameterDeclaration()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseparameterDeclaration()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseparameterDeclaration() {
    const __memoStart = this.position;
    const __memoKey = 'parameterDeclaration@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('parameterDeclaration', this.position);
    }
    const __ok = this._parseparameterDeclarationBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('parameterDeclaration', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('parameterDeclaration', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseparameterDeclarationBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsedeclarationSpecifiers()) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parsedeclarator()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsedeclarationSpecifiers()) { _ok_2 = false; }
      if (_ok_2) {
    // Optional: try parsing abstractDeclarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseabstractDeclarator()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseidentifierList() {
    const __memoStart = this.position;
    const __memoKey = 'identifierList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('identifierList', this.position);
    }
    const __ok = this._parseidentifierListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('identifierList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('identifierList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseidentifierListBody() {
    if (!this.consume('Identifier')) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('Identifier')) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseinitializer() {
    const __memoStart = this.position;
    const __memoKey = 'initializer@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initializer', this.position);
    }
    const __ok = this._parseinitializerBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('initializer', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('initializer', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseinitializerBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parseassignmentExpression()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__7B_')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parseinitializerList()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__7D_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__7B_')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.parseinitializerList()) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__2C_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__7D_')) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseinitializerList() {
    const __memoStart = this.position;
    const __memoKey = 'initializerList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('initializerList', this.position);
    }
    const __ok = this._parseinitializerListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('initializerList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('initializerList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseinitializerListBody() {
    // Optional: try parsing designation
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedesignation()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.parseinitializer()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    // Optional: try parsing designation
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedesignation()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_1) {
    if (!this.parseinitializer()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parsedesignation() {
    const __memoStart = this.position;
    const __memoKey = 'designation@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designation', this.position);
    }
    const __ok = this._parsedesignationBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('designation', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('designation', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedesignationBody() {
    if (!this.parsedesignatorList()) { return false; }
    if (!this.consume('TOKEN__3D_')) { return false; }

    return true;
  }
  parsedesignatorList() {
    const __memoStart = this.position;
    const __memoKey = 'designatorList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designatorList', this.position);
    }
    const __ok = this._parsedesignatorListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('designatorList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('designatorList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedesignatorListBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsedesignator()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parsedesignator() {
    const __memoStart = this.position;
    const __memoKey = 'designator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('designator', this.position);
    }
    const __ok = this._parsedesignatorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('designator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('designator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedesignatorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__5B_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseconstantExpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__5D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__2E_')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.consume('Identifier')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypeName() {
    const __memoStart = this.position;
    const __memoKey = 'typeName@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typeName', this.position);
    }
    const __ok = this._parsetypeNameBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typeName', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typeName', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypeNameBody() {
    if (!this.parsespecifierQualifierList()) { return false; }
    // Optional: try parsing abstractDeclarator
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseabstractDeclarator()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }

    return true;
  }
  parseabstractDeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'abstractDeclarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('abstractDeclarator', this.position);
    }
    const __ok = this._parseabstractDeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('abstractDeclarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('abstractDeclarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseabstractDeclaratorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsepointer()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    // Optional: try parsing pointer
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsepointer()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      if (_ok_2) {
    if (!this.parsedirectAbstractDeclarator()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsedirectAbstractDeclarator() {
    const __memoStart = this.position;
    const __memoKey = 'directAbstractDeclarator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directAbstractDeclarator', this.position);
    }
    const __ok = this._parsedirectAbstractDeclaratorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('directAbstractDeclarator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('directAbstractDeclarator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedirectAbstractDeclaratorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__28_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseabstractDeclarator()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__29_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsedirectAbstractDeclaratorSuffix()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsedirectAbstractDeclaratorSuffix()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        _ok_2 = false;
      }
    }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsedirectAbstractDeclaratorSuffix() {
    const __memoStart = this.position;
    const __memoKey = 'directAbstractDeclaratorSuffix@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('directAbstractDeclaratorSuffix', this.position);
    }
    const __ok = this._parsedirectAbstractDeclaratorSuffixBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('directAbstractDeclaratorSuffix', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('directAbstractDeclaratorSuffix', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsedirectAbstractDeclaratorSuffixBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__5B_')) { _ok_1 = false; }
      if (_ok_1) {
    // Optional: try parsing constantExpression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseconstantExpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__5D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      if (_ok_2) {
    // Optional: try parsing parameterTypeList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseparameterTypeList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsetypedefName() {
    const __memoStart = this.position;
    const __memoKey = 'typedefName@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('typedefName', this.position);
    }
    const __ok = this._parsetypedefNameBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('typedefName', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('typedefName', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsetypedefNameBody() {
    if (!this.consume('Identifier')) { return false; }

    return true;
  }
  parsestatement() {
    const __memoStart = this.position;
    const __memoKey = 'statement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('statement', this.position);
    }
    const __ok = this._parsestatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('statement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('statement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestatementBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parselabeledStatement()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parseexpressionStatement()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.parsecompoundStatement()) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.parseselectionStatement()) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.parseiterationStatement()) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.parsejumpStatement()) { _ok_6 = false; }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_7 = true;
    if (!this.consume('Comment')) { _ok_7 = false; }
      if (_ok_7) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parselabeledStatement() {
    const __memoStart = this.position;
    const __memoKey = 'labeledStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('labeledStatement', this.position);
    }
    const __ok = this._parselabeledStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('labeledStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('labeledStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parselabeledStatementBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('Identifier')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__3A_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parsestatement()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_case')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parseconstantExpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__3A_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parsestatement()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_default')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.consume('TOKEN__3A_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.parsestatement()) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseexpressionStatement() {
    const __memoStart = this.position;
    const __memoKey = 'expressionStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('expressionStatement', this.position);
    }
    const __ok = this._parseexpressionStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('expressionStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('expressionStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseexpressionStatementBody() {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
    if (!this.consume('TOKEN__3B_')) { return false; }

    return true;
  }
  parsecompoundStatement() {
    const __memoStart = this.position;
    const __memoKey = 'compoundStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('compoundStatement', this.position);
    }
    const __ok = this._parsecompoundStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('compoundStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('compoundStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsecompoundStatementBody() {
    if (!this.consume('TOKEN__7B_')) { return false; }
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseblockItem()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }
    if (!this.consume('TOKEN__7D_')) { return false; }

    return true;
  }
  parseblockItem() {
    const __memoStart = this.position;
    const __memoKey = 'blockItem@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('blockItem', this.position);
    }
    const __ok = this._parseblockItemBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('blockItem', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('blockItem', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseblockItemBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsestatement()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parsedeclaration()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsestatementList() {
    const __memoStart = this.position;
    const __memoKey = 'statementList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('statementList', this.position);
    }
    const __ok = this._parsestatementListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('statementList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('statementList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsestatementListBody() {
    {
      let count = 0;
      while (true) {
        const savePos = this.position;
        const saveMark = this.markEventState();
        if (!this.parsestatement()) {
          this.position = savePos;
          this.restoreEventState(saveMark);
          break;
        }
        if (this.position === savePos) break;
        count++;
      }
      if (count === 0) {
        return false;
      }
    }

    return true;
  }
  parseselectionStatement() {
    const __memoStart = this.position;
    const __memoKey = 'selectionStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('selectionStatement', this.position);
    }
    const __ok = this._parseselectionStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('selectionStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('selectionStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseselectionStatementBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_if')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__28_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseexpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__29_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parsestatement()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN_else')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parsestatement()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_if')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parseexpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parsestatement()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_switch')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.consume('TOKEN__28_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.parseexpression()) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__29_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.parsestatement()) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseiterationStatement() {
    const __memoStart = this.position;
    const __memoKey = 'iterationStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('iterationStatement', this.position);
    }
    const __ok = this._parseiterationStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('iterationStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('iterationStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseiterationStatementBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_while')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__28_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseexpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__29_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parsestatement()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_do')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parsestatement()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN_while')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parseexpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__3B_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_for')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.consume('TOKEN__28_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.parsedeclaration()) { _ok_3 = false; }
      }
      if (_ok_3) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__3B_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_3) {
    if (!this.consume('TOKEN__29_')) { _ok_3 = false; }
      }
      if (_ok_3) {
    if (!this.parsestatement()) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN_for')) { _ok_4 = false; }
      if (_ok_4) {
    if (!this.consume('TOKEN__28_')) { _ok_4 = false; }
      }
      if (_ok_4) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_4) {
    if (!this.consume('TOKEN__3B_')) { _ok_4 = false; }
      }
      if (_ok_4) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_4) {
    if (!this.consume('TOKEN__3B_')) { _ok_4 = false; }
      }
      if (_ok_4) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_4) {
    if (!this.consume('TOKEN__29_')) { _ok_4 = false; }
      }
      if (_ok_4) {
    if (!this.parsestatement()) { _ok_4 = false; }
      }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsejumpStatement() {
    const __memoStart = this.position;
    const __memoKey = 'jumpStatement@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('jumpStatement', this.position);
    }
    const __ok = this._parsejumpStatementBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('jumpStatement', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('jumpStatement', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsejumpStatementBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN_goto')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('Identifier')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__3B_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN_continue')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.consume('TOKEN__3B_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN_break')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.consume('TOKEN__3B_')) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN_return')) { _ok_4 = false; }
      if (_ok_4) {
    // Optional: try parsing expression
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseexpression()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_4) {
    if (!this.consume('TOKEN__3B_')) { _ok_4 = false; }
      }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseexpression() {
    const __memoStart = this.position;
    const __memoKey = 'expression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('expression', this.position);
    }
    const __ok = this._parseexpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('expression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('expression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseexpressionBody() {
    if (!this.parseassignmentExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseassignmentExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseassignmentExpression() {
    const __memoStart = this.position;
    const __memoKey = 'assignmentExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('assignmentExpression', this.position);
    }
    const __ok = this._parseassignmentExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('assignmentExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('assignmentExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseassignmentExpressionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parseconditionalExpression()) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseassignmentOperator()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseassignmentExpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parseconditionalExpression()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseassignmentOperator() {
    const __memoStart = this.position;
    const __memoKey = 'assignmentOperator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('assignmentOperator', this.position);
    }
    const __ok = this._parseassignmentOperatorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('assignmentOperator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('assignmentOperator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseassignmentOperatorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__3D_')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__2A__3D_')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__2F__3D_')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN__25__3D_')) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.consume('TOKEN__2B__3D_')) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.consume('TOKEN__2D__3D_')) { _ok_6 = false; }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_7 = true;
    if (!this.consume('TOKEN__3C__3C__3D_')) { _ok_7 = false; }
      if (_ok_7) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_8 = true;
    if (!this.consume('TOKEN__3E__3E__3D_')) { _ok_8 = false; }
      if (_ok_8) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_9 = true;
    if (!this.consume('TOKEN__26__3D_')) { _ok_9 = false; }
      if (_ok_9) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_10 = true;
    if (!this.consume('TOKEN__5E__3D_')) { _ok_10 = false; }
      if (_ok_10) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_11 = true;
    if (!this.consume('TOKEN__7C__3D_')) { _ok_11 = false; }
      if (_ok_11) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseconditionalExpression() {
    const __memoStart = this.position;
    const __memoKey = 'conditionalExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('conditionalExpression', this.position);
    }
    const __ok = this._parseconditionalExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('conditionalExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('conditionalExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseconditionalExpressionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parselogicalOrExpression()) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.consume('TOKEN__3F_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseexpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__3A_')) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.parseconditionalExpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parselogicalOrExpression()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseconstantExpression() {
    const __memoStart = this.position;
    const __memoKey = 'constantExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('constantExpression', this.position);
    }
    const __ok = this._parseconstantExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('constantExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('constantExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseconstantExpressionBody() {
    if (!this.parseconditionalExpression()) { return false; }

    return true;
  }
  parselogicalOrExpression() {
    const __memoStart = this.position;
    const __memoKey = 'logicalOrExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('logicalOrExpression', this.position);
    }
    const __ok = this._parselogicalOrExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('logicalOrExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('logicalOrExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parselogicalOrExpressionBody() {
    if (!this.parselogicalAndExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__7C__7C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parselogicalAndExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parselogicalAndExpression() {
    const __memoStart = this.position;
    const __memoKey = 'logicalAndExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('logicalAndExpression', this.position);
    }
    const __ok = this._parselogicalAndExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('logicalAndExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('logicalAndExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parselogicalAndExpressionBody() {
    if (!this.parseinclusiveOrExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__26__26_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseinclusiveOrExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseinclusiveOrExpression() {
    const __memoStart = this.position;
    const __memoKey = 'inclusiveOrExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('inclusiveOrExpression', this.position);
    }
    const __ok = this._parseinclusiveOrExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('inclusiveOrExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('inclusiveOrExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseinclusiveOrExpressionBody() {
    if (!this.parseexclusiveOrExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__7C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseexclusiveOrExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseexclusiveOrExpression() {
    const __memoStart = this.position;
    const __memoKey = 'exclusiveOrExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('exclusiveOrExpression', this.position);
    }
    const __ok = this._parseexclusiveOrExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('exclusiveOrExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('exclusiveOrExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseexclusiveOrExpressionBody() {
    if (!this.parseandExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__5E_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseandExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseandExpression() {
    const __memoStart = this.position;
    const __memoKey = 'andExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('andExpression', this.position);
    }
    const __ok = this._parseandExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('andExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('andExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseandExpressionBody() {
    if (!this.parseequalityExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__26_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseequalityExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseequalityExpression() {
    const __memoStart = this.position;
    const __memoKey = 'equalityExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('equalityExpression', this.position);
    }
    const __ok = this._parseequalityExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('equalityExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('equalityExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseequalityExpressionBody() {
    if (!this.parserelationalExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_2 = true;
    if (!this.consume('TOKEN__3D__3D_')) { _ok_2 = false; }
        if (_ok_2) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_3 = true;
    if (!this.consume('TOKEN__21__3D_')) { _ok_3 = false; }
        if (_ok_3) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { _ok_1 = false; }
    }
      if (_ok_1) {
    if (!this.parserelationalExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parserelationalExpression() {
    const __memoStart = this.position;
    const __memoKey = 'relationalExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('relationalExpression', this.position);
    }
    const __ok = this._parserelationalExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('relationalExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('relationalExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parserelationalExpressionBody() {
    if (!this.parseshiftExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_2 = true;
    if (!this.consume('TOKEN__3C_')) { _ok_2 = false; }
        if (_ok_2) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_3 = true;
    if (!this.consume('TOKEN__3E_')) { _ok_3 = false; }
        if (_ok_3) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_4 = true;
    if (!this.consume('TOKEN__3C__3D_')) { _ok_4 = false; }
        if (_ok_4) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_5 = true;
    if (!this.consume('TOKEN__3E__3D_')) { _ok_5 = false; }
        if (_ok_5) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { _ok_1 = false; }
    }
      if (_ok_1) {
    if (!this.parseshiftExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseshiftExpression() {
    const __memoStart = this.position;
    const __memoKey = 'shiftExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('shiftExpression', this.position);
    }
    const __ok = this._parseshiftExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('shiftExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('shiftExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseshiftExpressionBody() {
    if (!this.parseadditiveExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_2 = true;
    if (!this.consume('TOKEN__3C__3C_')) { _ok_2 = false; }
        if (_ok_2) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_3 = true;
    if (!this.consume('TOKEN__3E__3E_')) { _ok_3 = false; }
        if (_ok_3) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { _ok_1 = false; }
    }
      if (_ok_1) {
    if (!this.parseadditiveExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseadditiveExpression() {
    const __memoStart = this.position;
    const __memoKey = 'additiveExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('additiveExpression', this.position);
    }
    const __ok = this._parseadditiveExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('additiveExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('additiveExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseadditiveExpressionBody() {
    if (!this.parsemultiplicativeExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_2 = true;
    if (!this.consume('TOKEN__2B_')) { _ok_2 = false; }
        if (_ok_2) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_3 = true;
    if (!this.consume('TOKEN__2D_')) { _ok_3 = false; }
        if (_ok_3) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { _ok_1 = false; }
    }
      if (_ok_1) {
    if (!this.parsemultiplicativeExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parsemultiplicativeExpression() {
    const __memoStart = this.position;
    const __memoKey = 'multiplicativeExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('multiplicativeExpression', this.position);
    }
    const __ok = this._parsemultiplicativeExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('multiplicativeExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('multiplicativeExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsemultiplicativeExpressionBody() {
    if (!this.parsecastExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    // Group
    {
      let _matchedAlt = false;
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_2 = true;
    if (!this.consume('TOKEN__2A_')) { _ok_2 = false; }
        if (_ok_2) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_3 = true;
    if (!this.consume('TOKEN__2F_')) { _ok_3 = false; }
        if (_ok_3) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) {
        const _altStart = this.position;
        const _altMark = this.markEventState();
        let _ok_4 = true;
    if (!this.consume('TOKEN__25_')) { _ok_4 = false; }
        if (_ok_4) {
          _matchedAlt = true;
        } else {
          this.position = _altStart;
          this.restoreEventState(_altMark);
        }
      }
      if (!_matchedAlt) { _ok_1 = false; }
    }
      if (_ok_1) {
    if (!this.parsecastExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parsecastExpression() {
    const __memoStart = this.position;
    const __memoKey = 'castExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('castExpression', this.position);
    }
    const __ok = this._parsecastExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('castExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('castExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsecastExpressionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parseunaryExpression()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parsetypeName()) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
    if (!this.parsecastExpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseunaryExpression() {
    const __memoStart = this.position;
    const __memoKey = 'unaryExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('unaryExpression', this.position);
    }
    const __ok = this._parseunaryExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('unaryExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('unaryExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseunaryExpressionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.parsepostfixExpression()) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('Comment')) { _ok_2 = false; }
      if (_ok_2) {
    if (!this.parseunaryExpression()) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__2B__2B_')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.parseunaryExpression()) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN__2D__2D_')) { _ok_4 = false; }
      if (_ok_4) {
    if (!this.parseunaryExpression()) { _ok_4 = false; }
      }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.parseunaryOperator()) { _ok_5 = false; }
      if (_ok_5) {
    if (!this.parsecastExpression()) { _ok_5 = false; }
      }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.consume('TOKEN_sizeof')) { _ok_6 = false; }
      if (_ok_6) {
    if (!this.parseunaryExpression()) { _ok_6 = false; }
      }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_7 = true;
    if (!this.consume('TOKEN_sizeof')) { _ok_7 = false; }
      if (_ok_7) {
    if (!this.consume('TOKEN__28_')) { _ok_7 = false; }
      }
      if (_ok_7) {
    if (!this.parsetypeName()) { _ok_7 = false; }
      }
      if (_ok_7) {
    if (!this.consume('TOKEN__29_')) { _ok_7 = false; }
      }
      if (_ok_7) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseunaryOperator() {
    const __memoStart = this.position;
    const __memoKey = 'unaryOperator@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('unaryOperator', this.position);
    }
    const __ok = this._parseunaryOperatorBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('unaryOperator', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('unaryOperator', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseunaryOperatorBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__26_')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__2A_')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__2B_')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN__2D_')) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.consume('TOKEN__7E_')) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.consume('TOKEN__21_')) { _ok_6 = false; }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parsepostfixExpression() {
    const __memoStart = this.position;
    const __memoKey = 'postfixExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('postfixExpression', this.position);
    }
    const __ok = this._parsepostfixExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('postfixExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('postfixExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsepostfixExpressionBody() {
    if (!this.parseprimaryExpression()) { return false; }
    while (true) {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parsepostfixSuffix()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
        break;
      }
      if (this.position === savePos) break;
    }

    return true;
  }
  parsepostfixSuffix() {
    const __memoStart = this.position;
    const __memoKey = 'postfixSuffix@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('postfixSuffix', this.position);
    }
    const __ok = this._parsepostfixSuffixBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('postfixSuffix', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('postfixSuffix', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parsepostfixSuffixBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__5B_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseexpression()) { _ok_1 = false; }
      }
      if (_ok_1) {
    if (!this.consume('TOKEN__5D_')) { _ok_1 = false; }
      }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('TOKEN__28_')) { _ok_2 = false; }
      if (_ok_2) {
    // Optional: try parsing argumentExpressionList
    {
      const savePos = this.position;
      const saveMark = this.markEventState();
      if (!this.parseargumentExpressionList()) {
        this.position = savePos;
        this.restoreEventState(saveMark);
      }
    }
      }
      if (_ok_2) {
    if (!this.consume('TOKEN__29_')) { _ok_2 = false; }
      }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('TOKEN__2E_')) { _ok_3 = false; }
      if (_ok_3) {
    if (!this.consume('Identifier')) { _ok_3 = false; }
      }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN__2D__3E_')) { _ok_4 = false; }
      if (_ok_4) {
    if (!this.consume('Identifier')) { _ok_4 = false; }
      }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_5 = true;
    if (!this.consume('TOKEN__2B__2B_')) { _ok_5 = false; }
      if (_ok_5) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_6 = true;
    if (!this.consume('TOKEN__2D__2D_')) { _ok_6 = false; }
      if (_ok_6) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseprimaryExpression() {
    const __memoStart = this.position;
    const __memoKey = 'primaryExpression@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('primaryExpression', this.position);
    }
    const __ok = this._parseprimaryExpressionBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('primaryExpression', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('primaryExpression', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseprimaryExpressionBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('Identifier')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.parseconstant()) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('StringLiteral')) { _ok_3 = false; } else { while (this.match('StringLiteral')) { /* one or more */ } }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('TOKEN__28_')) { _ok_4 = false; }
      if (_ok_4) {
    if (!this.parseexpression()) { _ok_4 = false; }
      }
      if (_ok_4) {
    if (!this.consume('TOKEN__29_')) { _ok_4 = false; }
      }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseargumentExpressionList() {
    const __memoStart = this.position;
    const __memoKey = 'argumentExpressionList@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('argumentExpressionList', this.position);
    }
    const __ok = this._parseargumentExpressionListBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('argumentExpressionList', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('argumentExpressionList', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseargumentExpressionListBody() {
    if (!this.parseassignmentExpression()) { return false; }
    // Group *
    while (true) {
      const _loopStart = this.position;
      const _loopMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('TOKEN__2C_')) { _ok_1 = false; }
      if (_ok_1) {
    if (!this.parseassignmentExpression()) { _ok_1 = false; }
      }
      if (!_ok_1) {
        this.position = _loopStart;
        this.restoreEventState(_loopMark);
        break;
      }
      if (this.position === _loopStart) break;
    }

    return true;
  }
  parseconstant() {
    const __memoStart = this.position;
    const __memoKey = 'constant@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('constant', this.position);
    }
    const __ok = this._parseconstantBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('constant', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('constant', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseconstantBody() {
    const _ruleStart = this.position;
    let _matched = false;
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_1 = true;
    if (!this.consume('IntegerConstant')) { _ok_1 = false; }
      if (_ok_1) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_2 = true;
    if (!this.consume('CharacterConstant')) { _ok_2 = false; }
      if (_ok_2) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_3 = true;
    if (!this.consume('FloatingConstant')) { _ok_3 = false; }
      if (_ok_3) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      const _ruleMark = this.markEventState();
      let _ok_4 = true;
    if (!this.consume('Identifier')) { _ok_4 = false; }
      if (_ok_4) {
        _matched = true;
      } else {
        this.position = _ruleStart;
        this.restoreEventState(_ruleMark);
      }
    }
    if (!_matched) {
      return false;
    }

    return true;
  }
  parseIgnore() {
    const __memoStart = this.position;
    const __memoKey = 'Ignore@' + __memoStart;
    if (this.failureMemo.has(__memoKey)) {
      return false;
    }
    if (this._canMemoSuccess) {
      const __memoHit = this.successMemo.get(__memoKey);
      if (__memoHit !== undefined) {
        this.position = __memoHit.endPos;
        if (this.eventHandler && __memoHit.node) {
          this.eventHandler.appendNode(__memoHit.node);
        }
        return true;
      }
    }
    if (this.eventHandler && typeof this.eventHandler.startNonterminal === 'function') {
      this.eventHandler.startNonterminal('Ignore', this.position);
    }
    const __ok = this._parseIgnoreBody();
    if (!__ok) {
      if (this.failureMemo.size > 200000) {
        this.failureMemo.clear();
      }
      this.failureMemo.add(__memoKey);
    }
    if (this.eventHandler) {
      if (__ok && typeof this.eventHandler.endNonterminal === 'function') {
        this.eventHandler.endNonterminal('Ignore', this.position);
      }
      if (!__ok && typeof this.eventHandler.abortNonterminal === 'function') {
        this.eventHandler.abortNonterminal('Ignore', this.position);
      }
    }
    if (__ok && this._canMemoSuccess) {
      if (this.successMemo.size > 200000) {
        this.successMemo.clear();
      }
      this.successMemo.set(__memoKey, {
        endPos: this.position,
        node: this.eventHandler ? this.eventHandler.lastClosedNode : null
      });
    }
    return __ok;
  }

  _parseIgnoreBody() {
    if (!this.consume('WhiteSpace')) { return false; }

    return true;
  }
}

module.exports = Parser;
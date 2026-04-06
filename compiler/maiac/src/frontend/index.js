const GeneratedCParser = require('../../../C-parser');
const ast = require('../ast/nodes');

class TokenStream {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  peek() {
    return this.tokens[this.index] || { type: 'EOF', value: '' };
  }

  next() {
    const tok = this.peek();
    this.index += 1;
    return tok;
  }

  expect(type, value) {
    const tok = this.next();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(`Expected ${value || type}, got ${tok.value || tok.type}`);
    }
    return tok;
  }

  match(type, value) {
    const tok = this.peek();
    if (tok.type === type && (value === undefined || tok.value === value)) {
      this.index += 1;
      return true;
    }
    return false;
  }
}

function getSemanticTokensFromGeneratedParser(source) {
  const parser = new GeneratedCParser(source);
  parser.parse();

  return parser.tokens.filter((t) => ![
    'WhiteSpace',
    'Comment',
    'PreprocessingDirective',
    'EOF',
  ].includes(t.type));
}

function parseSubsetFromValidatedTokens(tokens) {
  const ts = new TokenStream(tokens);

  ts.expect('TOKEN_int');
  const fnName = ts.expect('Identifier').value;
  ts.expect('TOKEN__28_');
  ts.expect('TOKEN__29_');

  const body = parseBlock(ts);

  return ast.program([
    ast.funcDecl(fnName, 'int', [], body),
  ]);
}

function parseBlock(ts) {
  ts.expect('TOKEN__7B_');
  const statements = [];
  while (!ts.match('TOKEN__7D_')) {
    statements.push(parseStatement(ts));
  }
  return ast.block(statements);
}

function parseStatement(ts) {
  const tok = ts.peek();
  if (tok.type === 'TOKEN_return') {
    ts.next();
    const expr = parseExpression(ts);
    ts.expect('TOKEN__3B_');
    return ast.returnStmt(expr);
  }

  const expr = parseExpression(ts);
  ts.expect('TOKEN__3B_');
  return ast.exprStmt(expr);
}

function parseExpression(ts) {
  return parseAddSub(ts);
}

function parseAddSub(ts) {
  let left = parseMulDiv(ts);
  while (true) {
    if (ts.match('TOKEN__2B_')) {
      left = ast.binaryExpr('+', left, parseMulDiv(ts));
    } else if (ts.match('TOKEN__2D_')) {
      left = ast.binaryExpr('-', left, parseMulDiv(ts));
    } else {
      break;
    }
  }
  return left;
}

function parseMulDiv(ts) {
  let left = parsePrimary(ts);
  while (true) {
    if (ts.match('TOKEN__2A_')) {
      left = ast.binaryExpr('*', left, parsePrimary(ts));
    } else if (ts.match('TOKEN__2F_')) {
      left = ast.binaryExpr('/', left, parsePrimary(ts));
    } else {
      break;
    }
  }
  return left;
}

function parsePrimary(ts) {
  const tok = ts.peek();

  if (tok.type === 'IntegerConstant') {
    ts.next();
    return ast.intLiteral(Number(tok.value));
  }

  if (ts.match('TOKEN__28_')) {
    const expr = parseExpression(ts);
    ts.expect('TOKEN__29_');
    return expr;
  }

  if (tok.type === 'Identifier') {
    const ident = ts.next().value;
    ts.expect('TOKEN__28_');
    const args = [];
    if (!ts.match('TOKEN__29_')) {
      args.push(parseExpression(ts));
      while (ts.match('TOKEN__2C_')) {
        args.push(parseExpression(ts));
      }
      ts.expect('TOKEN__29_');
    }
    return ast.callExpr(ident, args);
  }

  throw new Error(`Unexpected token ${tok.type}:${tok.value}`);
}

function parseToAst(source, options = {}) {
  const mode = options.mode || 'subset';

  if (mode !== 'subset') {
    throw new Error(`Unsupported frontend mode: ${mode}`);
  }

  const tokens = getSemanticTokensFromGeneratedParser(source);
  return parseSubsetFromValidatedTokens(tokens);
}

module.exports = {
  parseToAst,
};

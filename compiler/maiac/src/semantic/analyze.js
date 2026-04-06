const { resolveImportByCName } = require('../runtime-abi/contracts');

function analyze(ast) {
  if (!ast || ast.kind !== 'Program') {
    throw new Error('Invalid AST root');
  }

  const fnNames = new Set();
  let hasMain = false;

  for (const fn of ast.functions) {
    if (fn.kind !== 'FunctionDecl') throw new Error('Invalid function node');
    if (fnNames.has(fn.name)) throw new Error(`Duplicate function: ${fn.name}`);
    fnNames.add(fn.name);

    if (fn.name === 'main') {
      hasMain = true;
      if (fn.returnType !== 'int') {
        throw new Error('main must return int in v1');
      }
    }

    validateFunctionBody(fn);
  }

  if (!hasMain) {
    throw new Error('Program must define int main()');
  }

  return ast;
}

function validateFunctionBody(fn) {
  let hasReturn = false;
  for (const stmt of fn.body.statements) {
    if (stmt.kind === 'ReturnStmt') {
      hasReturn = true;
      validateExpr(stmt.expression);
      continue;
    }

    if (stmt.kind === 'ExprStmt') {
      validateExpr(stmt.expression);
      if (stmt.expression.kind !== 'CallExpr') {
        throw new Error('Only call expression statements are supported in v1');
      }
      continue;
    }

    throw new Error(`Unsupported statement: ${stmt.kind}`);
  }

  if (!hasReturn) {
    throw new Error(`Function ${fn.name} must end with return in v1`);
  }
}

function validateExpr(expr) {
  if (!expr) throw new Error('Missing expression');

  switch (expr.kind) {
    case 'IntLiteral':
      return;
    case 'BinaryExpr':
      validateExpr(expr.left);
      validateExpr(expr.right);
      return;
    case 'CallExpr': {
      const imported = resolveImportByCName(expr.callee);
      if (!imported) {
        throw new Error(`Unknown callable '${expr.callee}' in v1`);
      }
      if (imported.params.length !== expr.args.length) {
        throw new Error(`Invalid arg count for ${expr.callee}`);
      }
      for (const arg of expr.args) validateExpr(arg);
      return;
    }
    default:
      throw new Error(`Unsupported expression: ${expr.kind}`);
  }
}

module.exports = {
  analyze,
};

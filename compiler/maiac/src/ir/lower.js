const { resolveImportByCName } = require('../runtime-abi/contracts');

function lowerToMir(ast) {
  const imports = new Map();

  const mirFunctions = ast.functions.map((fn) => {
    const body = [];

    for (const stmt of fn.body.statements) {
      if (stmt.kind === 'ExprStmt' && stmt.expression.kind === 'CallExpr') {
        emitExpr(stmt.expression, body, imports);
      } else if (stmt.kind === 'ReturnStmt') {
        emitExpr(stmt.expression, body, imports);
        body.push({ op: 'return' });
      }
    }

    return {
      name: fn.name,
      params: [],
      result: 'i32',
      body,
      exported: fn.name === 'main',
    };
  });

  return {
    kind: 'MirModule',
    imports: [...imports.values()],
    functions: mirFunctions,
  };
}

function emitExpr(expr, out, imports) {
  switch (expr.kind) {
    case 'IntLiteral':
      out.push({ op: 'i32.const', value: expr.value });
      return;

    case 'BinaryExpr':
      emitExpr(expr.left, out, imports);
      emitExpr(expr.right, out, imports);
      if (expr.operator === '+') out.push({ op: 'i32.add' });
      else if (expr.operator === '-') out.push({ op: 'i32.sub' });
      else if (expr.operator === '*') out.push({ op: 'i32.mul' });
      else if (expr.operator === '/') out.push({ op: 'i32.div_s' });
      else throw new Error(`Unsupported operator: ${expr.operator}`);
      return;

    case 'CallExpr': {
      const imported = resolveImportByCName(expr.callee);
      if (!imported) throw new Error(`Unknown import mapping for ${expr.callee}`);
      for (const arg of expr.args) emitExpr(arg, out, imports);

      const key = `${imported.module}.${imported.name}`;
      if (!imports.has(key)) {
        imports.set(key, {
          module: imported.module,
          name: imported.name,
          params: imported.params,
          result: imported.result,
          symbol: `$imp_${imported.name}`,
        });
      }
      out.push({ op: 'call', target: imports.get(key).symbol });
      return;
    }

    default:
      throw new Error(`Unsupported expr kind: ${expr.kind}`);
  }
}

module.exports = {
  lowerToMir,
};

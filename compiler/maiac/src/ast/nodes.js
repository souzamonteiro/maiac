function program(functions) {
  return { kind: 'Program', functions };
}

function funcDecl(name, returnType, params, body) {
  return { kind: 'FunctionDecl', name, returnType, params, body };
}

function block(statements) {
  return { kind: 'BlockStmt', statements };
}

function returnStmt(expression) {
  return { kind: 'ReturnStmt', expression };
}

function exprStmt(expression) {
  return { kind: 'ExprStmt', expression };
}

function callExpr(callee, args) {
  return { kind: 'CallExpr', callee, args };
}

function binaryExpr(operator, left, right) {
  return { kind: 'BinaryExpr', operator, left, right };
}

function intLiteral(value) {
  return { kind: 'IntLiteral', value };
}

module.exports = {
  program,
  funcDecl,
  block,
  returnStmt,
  exprStmt,
  callExpr,
  binaryExpr,
  intLiteral,
};

const { parseToAst } = require('../frontend');
const { analyze } = require('../semantic/analyze');
const { lowerToMir } = require('../ir/lower');
const { emitWat } = require('../backend/wat/emit');

function compileCStringToWat(source, options = {}) {
  const ast = parseToAst(source, { mode: options.mode || 'subset' });
  const analyzedAst = analyze(ast);
  const mir = lowerToMir(analyzedAst);
  const wat = emitWat(mir);

  return {
    ast: analyzedAst,
    mir,
    wat,
  };
}

module.exports = {
  compileCStringToWat,
};

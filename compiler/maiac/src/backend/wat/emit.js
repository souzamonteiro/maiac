function emitWat(mir) {
  const lines = [];
  lines.push('(module');

  for (const imp of mir.imports) {
    const params = imp.params.length ? ` (param ${imp.params.join(' ')})` : '';
    const result = imp.result ? ` (result ${imp.result})` : '';
    lines.push(`  (import "${imp.module}" "${imp.name}" (func ${imp.symbol}${params}${result}))`);
  }

  for (const fn of mir.functions) {
    const params = fn.params.length ? ` (param ${fn.params.join(' ')})` : '';
    const result = fn.result ? ` (result ${fn.result})` : '';

    lines.push(`  (func $${fn.name}${params}${result}`);
    for (const instr of fn.body) {
      lines.push(`    ${emitInstr(instr)}`);
    }
    lines.push('  )');

    if (fn.exported) {
      lines.push(`  (export "${fn.name}" (func $${fn.name}))`);
    }
  }

  lines.push(')');
  return lines.join('\n');
}

function emitInstr(instr) {
  switch (instr.op) {
    case 'i32.const': return `(i32.const ${instr.value})`;
    case 'i32.add': return '(i32.add)';
    case 'i32.sub': return '(i32.sub)';
    case 'i32.mul': return '(i32.mul)';
    case 'i32.div_s': return '(i32.div_s)';
    case 'call': return `(call ${instr.target})`;
    case 'return': return '(return)';
    default:
      throw new Error(`Unsupported MIR instruction: ${instr.op}`);
  }
}

module.exports = {
  emitWat,
};

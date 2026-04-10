const Parser = require('../c-parser.js');

const code = `int test_entry() { struct N { int v; } n,*p; p = &n; return p->v; }`;

try {
  const parser = new Parser(code, {collectComments: false});
  const ast = parser.parse();
  
  if (!ast) {
    console.log('ERROR: parse() returned undefined');
    console.log('Parser errors:', parser.errors || 'none');
    process.exit(1);
  }
  
  console.log('AST root name:', ast.name);
  console.log('AST root kind:', ast.kind);
  console.log('AST children count:', ast.children?.length);
  
  // Count all nonterminal types
  const names = new Set();
  function collectNames(node) {
    if (node.kind === 'nonterminal') {
      names.add(node.name);
    }
    if (node.children) {
      node.children.forEach(collectNames);
    }
  }
  collectNames(ast);
  console.log('Nonterminals found:', Array.from(names).sort().join(', '));
  
  // Now try to find postfixExpression
  function findPostfix(node) {
    if (node.kind === 'nonterminal' && node.name === 'postfixExpression') {
      console.log('\n=== FOUND postfixExpression ===');
      node.children?.forEach((child, i) => {
        console.log(`  Child ${i}: kind=${child.kind}, name=${child.name}, token=${child.token}, value=${child.value}`);
      });
      
      // Show suffixes
      const suffixes = node.children?.filter(c => c.kind === 'nonterminal' && c.name === 'postfixSuffix');
      console.log(`Found ${suffixes?.length} postfixSuffixes:`);
      suffixes?.forEach((suffix, i) => {
        console.log(`  Suffix ${i}:`);
        suffix.children?.forEach((child, j) => {
          console.log(`    ${j}: kind=${child.kind}, token=${child.token}, value=${child.value}`);
        });
      });
    }
    
    if (node.children) {
      node.children.forEach(findPostfix);
    }
  }
  
  findPostfix(ast);
  
} catch (error) {
  console.error('Parse error:', error.message);
  console.error(error.stack);
}

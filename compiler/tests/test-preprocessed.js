const { preprocessCSource } = require('../c-preprocessor.js');

const code = `
int test_entry() {
  struct Node node;
  struct Node *p = &node;
  node.value = 10;
  return p->value;
}
`;

try {
  const preprocessed = preprocessCSource(code);
  console.log('PREPROCESSED CODE:');
  console.log(preprocessed);
} catch (error) {
  console.error('Error:', error.message);
}

'use strict';

const assert = require('assert');
const Parser = require('../c-parser.js');

const source = [
  '/* first comment */',
  '/* second comment */',
  'int main(void) { return 0; }'
].join('\n');

const parser = new Parser(source);
const types = parser.tokens.map((token) => token.type);

assert.ok(types.includes('TOKEN_int'), 'the declaration after block comments must be tokenized');
assert.ok(types.includes('TOKEN_return'), 'the function body after block comments must be tokenized');
assert.ok(parser.tokens.length > 2, 'multiple comments must not consume the remaining source');

parser.parse();
console.log('PASS block comments preserve following C tokens');

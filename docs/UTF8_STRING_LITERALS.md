# UTF-8 narrow string literals

Raw Unicode scalar characters in ordinary narrow string literals use UTF-8
execution bytes, without normalization. For example, raw `é` occupies two bytes
plus the terminating NUL; `\xE9` or `\351` still occupies one explicit byte plus
NUL. Embedded escaped NULs preserve subsequent bytes. Adjacent literal fragments
retain independent numeric escape boundaries before their bytes are combined.

The owning `grammar/C.ebnf` recognizes raw scalar ranges, excluding isolated
surrogate code units. Regenerate the parser with `npm run build:parser` using
this repository's MaiaCC submodule. `parseCStringLiteral` produces the shared
byte representation for array bounds, sizeof, initializers and string data.
Do not re-encode numeric escape values as Unicode text.

`node compiler/tests/test-utf8-string-literals.js` checks independent numeric
byte expectations, six storage forms, sizes and aggregate canaries against
native C89 with ASan/UBSan and actual WASM. It covers accents, combining marks,
CJK, supplementary and boundary scalars, explicit octal/hex bytes, embedded NULs,
concatenation, token spans and malformed surrogate rejection. The full suite
includes this regression.

This contract does not add wide strings, raw character-constant Unicode,
universal-character-name semantics, locale selection or a different CLI file
loader decoding policy. It does not claim full C89 literal conformance.

Validation (2026-10-27): focused regression passes; `npm run test:full`
passes 47 bundle groups plus 13 extras. Two successive `npm run build:parser`
runs reproduce parser/XML hashes exactly. The required test.c example produces
valid WASM byte-identical to assembly of its WAT. Regenerated tracked example
manifest timestamps are retained under the owner artifact policy.

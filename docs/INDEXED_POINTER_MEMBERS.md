# Pointer metadata after indexed struct selection

2026-11-02. Owner-approved BRE frontend prerequisite.

`tokens[i].value - source` previously diagnosed integer-minus-pointer even when
value was declared const char*. Pointer classification and element-stride
inference stopped at the indexed struct object, before its trailing member path.
Both now resolve trailing fields from that object's existing struct address
metadata. An indexed expression without a trailing field retains its previous
classification. No grammar, object layout or memory load/store interface changes.

Selected pointer operands are also retained through additive expression inference,
so `(tokens[i].value + 2) - source` uses the same pointee stride. Actual arithmetic
lowering still rejects invalid pointer combinations. Pointer subtraction remains
signed and divides the address difference by element size; it does not reinterpret
all integer-valued struct members as pointers.

`node compiler/tests/test-indexed-pointer-members.js` passes 20 independent native
C89/ASan/UBSan/WASM vectors plus two negative native/compiler cases. Coverage:
char*, const char*, int*, struct pointers, pointer-to-pointer members, global,
static and automatic arrays, nonzero subscripts, nested members, selected array
fields, struct-pointer bases, negative differences, compound additive expressions
and adjacent guard fields. Both a bare integer and an actual integer member
subtracted from a pointer continue to fail compilation. The test joins npm test.

Full owner validation passed: npm run test:full (bundle plus13/13 extra scripts),
followed by npm run compile:example. The example is also rebuilt through
compileSource with validate:true; an older tracked WASM is not used as evidence. Cross-language
C++98 -> emitted strict C89 -> WASM tests are a downstream MaiaCpp gate after it
consumes the published MaiaC through local submodules. No sibling compiler
fallback, npm/version change or MaiaOS/MaiaRegex publication is part of this fix.

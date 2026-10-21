# Complete struct values in indexed expressions

2026-10-21. Authorized during MaiaGlob / MaiaOS shell integration.

A fully indexed struct expression was lowered as a scalar load/store of its first
machine word. `array[i] = source` could store the source address instead of copying
the complete object; `target = source[j]` likewise lost the aggregate address.
This corrupted MaiaGlob instruction programs during real shell enumeration.

A strict C89 reduction with fields {op=3, first=46, count=7} returned the expected
sum 56 natively and 1048 through the prior MaiaC, while direct individual field
writes/readback returned 56 in both. The result is memory-dependent corruption,
not a guaranteed fixed erroneous value or a grammar-recursion diagnosis.

The compiler now resolves the struct layout of a fully indexed object and reuses
its existing aggregate-copy emitter for assignment. Struct-valued indexed rvalues
retain their object address. Remaining array dimensions still denote subarrays;
arrays of struct pointers still select pointer-sized scalar slots. Public APIs,
grammar, generated parser and release version are unchanged.

Regressions cover poisoned destination fields, adjacent-object canaries,
source/destination indices with side effects, pointer parameters, struct-valued
member arrays/pointer fields, multidimensional arrays, pointer-array scalar
stores and const-destination rejection. Existing local, nested and dereferenced
struct assignment regressions remain enabled in the full test bundle.

Validation: focused tests PASS; strict native reduction and actual WASM now both
return 56; compiler/examples/test.c compiles and validates (23436 bytes).
`npm run test:full`: PASS, complete bundle plus 13/13 extra diagnostics.
Full log: /tmp/maia-c-struct-copy-full.log. Test-produced example artifacts are
preserved uncommitted and excluded from the fix publication. Consumers follow the published
MaiaC -> MaiaCpp -> MaiaJS/MaiaGlob -> MaiaOS gitlink sequence, without npm,
version changes or MaiaOS feature publication.

## Member-array and pointer-field arithmetic

The shell's component traversal then exposed a second addressing defect:
`value.text + 5` advanced 20 bytes for a byte-array member; a 12-byte struct-array
member advanced only 4 bytes per element. Member access carries its element type,
array dimensions and pointer depth on the resolved field, whereas the former
stride calculation read the address-valued wrapper. Pointer fields were also
missing from pointer classification. The correction reads the field metadata and
uses the existing indexed-stride calculation. No library workaround, API or
grammar change is needed.

Regressions assert byte, struct, multidimensional row and pointer-array strides,
byte/struct/double-pointer field arithmetic, and integer casts that stop pointer
scaling. Focused tests and `npm run test:full` PASS (bundle plus 13/13 extra
diagnostics); log /tmp/maia-c-member-stride-full.log. Generated example artifacts
remain uncommitted and excluded from publication.

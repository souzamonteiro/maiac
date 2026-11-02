# Parenthesized named function declarators

Reviewed 2026-11-02. Redundant grouping around a function name preserves its
semantic identity: `void (release)(void *);` and `void release(void *p) { ... }`
declare/define one function. Previously the prototype was classified as a global
object, creating an invalid module with a duplicate export.

The semantic declarator traversal now follows the identifier's declarator spine
through transparent grouping. The first pointer or suffix establishes binding;
it never traverses a parameter's declarator. Thus `(*callback)(int)` remains a
pointer object and `(*get(void))(int)` retains the inner function's parameters.
No grammar, generated parser, public API or export-filter workaround changed.

`node compiler/tests/test-parenthesized-function-declarators.js` checks 39
positive C89 programs in strict Clang with ASan/UBSan and actual own-chain WASM:
ordinary/one/three-level grouping, both declaration orders, repeated compatible
prototypes, static/external controls, direct and callback calls, side effects,
void-pointer parameters, pointer returns and returned callbacks. Semantic model
and exports contain exactly one function, no same-name global. Each guest entry
runs twice. Five negative cases preserve return/parameter/list/linkage/redefinition
diagnostics and are independently rejected by strict Clang.

The regression belongs to the full bundle. Publication requires
`npm run test:full`, `npm run compile:example`, and validation of the rebuilt
example before downstream synchronization. Node WebAssembly is the reference
runtime here; this does not establish MaiaWASMVM/device conformance.

Validation completed: `npm run test:full` passed the complete bundle and all
13 extra scripts; `npm run compile:example` passed. The example was separately
rebuilt and validated as a WebAssembly module (23,395 bytes). The 36 tracked
example manifests differ only in generation metadata; executable artifacts
remain unchanged. No version or npm publication change.

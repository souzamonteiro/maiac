# Unsigned compound integer assignment

2026-10-24. The MaiaOS numeric printf consumer exposed a compiler defect:
`unsigned int x = 4294967295U; x /= 10;` returned0 instead of429496729.
The ordinary division path selected `i32.div_u`, but compound assignments chose
signed division, remainder and right shift unconditionally.

The owning fix is in compiler/c-compiler.js. `/=` and `%=` now choose signedness
after operand promotion/common-width selection; `>>=` uses the promoted left
operand independently of the right operand's signedness. The selected integer
path preserves the RHS width until arithmetic, then converts back for storage.
Unsigned32 operands widen to64 with zero extension. Unsigned char/short operands
promote to signed int after restoring their unsigned narrow value. Existing
non-integer/other assignment paths and generated grammar/parser stay unchanged.

Regression: node compiler/tests/test-unsigned-compound-assignment.js. It compares
the same C89 cases with native Clang and actual WASM: local/global/array/pointer/
member targets, signed controls, mixed signed/unsigned operands, narrow promotions,
function-return/cast RHS and assignment-result use. Additional i64 exports are
checked with exact BigInt division/remainder/shift expectations. No libc/import
dependency or host arithmetic replacement exists in the generated guest.

The focused test belongs to test-all.js; npm run test:full exercises the existing
regression bundle and extra diagnostics. CLI example artifacts follow the README
versioning policy. No C ABI, grammar, release version or npm change. Downstream
consumption must follow the ecosystem protocol and use published submodule pins.

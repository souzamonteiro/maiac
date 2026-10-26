# Addressable static struct members

Direct member access uses existing linear-memory backing for supported global
and static struct objects, including initialized static locals. The same address
is used by `object.field`, `&object.field` and pointer aliases of the object.
Static local initialization runs once, not on each function call. Existing layout,
alignment, zero-fill and positional aggregate initialization rules are unchanged.

Both named-member resolution paths use the common addressable-storage helper
instead of requiring a local stack offset. Dot access still requires a struct
object; a scalar or pointer cannot use dot, and arrow still requires a pointer.
Root const-object qualification propagates through dot members to assignment,
compound assignment and prefix/postfix update checks. Following a pointer member
uses its pointee qualification rather than treating the containing object's const
qualification as const on the pointed-to object.

`node compiler/tests/test-static-struct-members.js` checks 16 positive cases
against strict native C89 with ASan/UBSan and actual MaiaC-produced WASM, plus
nine negative cases rejected independently by Clang and MaiaC. Coverage includes
nested members/address-of, aliases, static lifetime, narrow/unsigned/floating
fields, whole-struct and nested copies, callback fields and side-effect counts.
The test is included in the default and full suites.

This correction does not widen the supported C subset to all C89 constructs.
In particular, the distinct scalar global-pointer initializer
`static struct S *p = &global_struct;` still reports an unknown constant;
assigning that pointer at runtime works. Unions, bitfields, designated
initializers and wider qualifier handling are not introduced by this correction.
The generated C parser, memory ABI and public compiler API are unchanged.

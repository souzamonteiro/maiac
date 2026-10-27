# Numeric constant casts in static initializers

The constant evaluator follows the cast operand and applies the parsed target
type instead of descending into the type-name subtree and producing zero.
Supported integer casts truncate and apply target width/signedness; float casts
round through f32 and double casts retain the numeric operand. Floating literals
are evaluated as numeric values within cast operands. The same conversion feeds
aggregate storage and scalar globals, including `(double)19` with no floating
literal token. Existing null pointer casts remain valid.

`node compiler/tests/test-static-constant-casts.js` checks14 conversions through
global aggregate fields, static-local aggregate fields and scalar global storage:
42 explicit native C89/ASan/UBSan and actual-WASM results. Cases include narrowing,
unsigned conversion, negative values, nested/typedef casts, arithmetic around a
cast, f32 rounding and an exactly representable wide value. Guest getters expose
the numeric value directly, so expected values are independent host assertions.
Both aggregate paths also check adjacent guard fields. The default/full bundle
includes this test and the earlier static-member/lifetime regressions.

The existing evaluator stores numeric constants as JavaScript numbers. Integral
cast operands/results outside its exact safe-integer range are now diagnosed
explicitly; this is not full arbitrary-precision C89 constant evaluation. Existing
constant arithmetic rules are unchanged by this bounded cast correction. General
non-null pointer constant casts remain unsupported; the separate scalar global
pointer address-initializer limitation is not fixed here. No generated parser,
runtime API or memory-layout change is involved.

# Phase 4 Edge Case: Array of Function Pointers with Indexed Call

## Problem Statement

When compiling an array of function pointers declared as `int (*ops[2])(int, int)` with indexed function calls like `(ops[0])(10, 2)`, the compiler fails to generate `call_indirect` instructions.

## Test Case

```c
int inc(int x, int y) { return x + y + 1; }
int dec(int x, int y) { return x - y - 1; }

int test_entry() {
  int (*ops[2])(int, int);
  int a, b;
  ops[0] = inc;
  ops[1] = dec;
  a = (ops[0])(10, 2);   // Expected: 13, Actual: 0
  b = (ops[1])(10, 2);   // Expected: 7, Actual: 0
  return a + b;          // Expected: 20, Actual: 0
}
```

## Expected vs Actual WAT

### Expected WAT for `a = (ops[0])(10, 2)`:
```wasm
local.get $__frame       ; address of 'a'
i32.const 8
i32.add
local.get $__frame       ; address of ops[0]
i32.const 0
i32.const 4
i32.mul
i32.add
i32.load                 ; load function pointer index
i32.const 10             ; arg 1
i32.const 2              ; arg 2
call_indirect (type $funcptr_type)  ; call indirect
local.set $__tmp_i32
local.get $__tmp_i32
i32.store                ; store result in 'a'
```

###Actual WAT for `a = (ops[0])(10, 2)`:
```wasm
local.get $__frame
i32.const 8
i32.add
i32.const 10             ; arg 1
i32.const 2              ; arg 2
drop                     ; PROBLEM: Arguments discarded!
drop
i32.const 0              ; PROBLEM: Returns 0 instead of calling
local.set $__tmp_i32
local.get $__tmp_i32
i32.store
```

## Root Cause Analysis

The issue is in `compilePostfixExpression` function (around line 4879 in c-compiler.js):

1. When processing `(ops[0])(10, 2)`, the compiler correctly identifies:
   - `accessInfo` from `ops[0]` indexing
   - `callSuffix` from `(10, 2)` function call signature

2. However, in the code path that handles indexed access with function calls (lines 4943-4974), the compiler:
   - Compiles arguments `(10, 2)` → pushes them on stack
   - Checks if `accessInfo.resultIsAddress` is false before loading the function pointer
   - **FAILS**: Does not properly generate the `call_indirect` instruction
   - Result: Arguments are discarded, 0 is pushed, stored inappropriately

## Current Limitation

**Status**: Documented as Phase 4 edge case  
**Workaround**: Use typedef for function pointer arrays:

```c
typedef int (*binop_t)(int, int);

int test_entry() {
  binop_t ops[2];  // Use typedef instead
  ops[0] = inc;
  ops[1] = dec;
  int a = (ops[0])(10, 2);  // Works correctly
  return a;
}
```

Or use direct function pointer variable (not array):

```c
int (*fn)(int, int) = inc;
return fn(10, 2);  // Works correctly
```

## Files Affected

- `compiler/c-compiler.js` - `compilePostfixExpression()` function
- `compiler/c-compiler.js` - `getIndexedAccessInfoFromPostfix()` function

## Estimated Fix Complexity

**Medium**: Requires careful handling of:
1. Distinguishing function pointer types in indexed expressions
2. Ensuring proper stack discipline for `call_indirect`
3. Validating function signature matching before indirect call

## Next Steps

1. Add debug logging to `compilePostfixExpression()` to trace code path selection
2. Verify `accessInfo.watType` correctly identifies indirect function pointers
3. Ensurethe `callSuffix` handling properly emits `call_indirect` with correct type signature
4. Add AST-level diagnostic to catch this pattern early and provide helpful error message

# MaiaC Compiler - Next Steps & Handoff Guide

## For the Next Developer

This document captures the current state and provides clear direction for the next work phase.

## Current State (as of 2026-04-10)

✅ **Phase 1: Critical Fixes** - COMPLETE
- 3 features fixed and tested
- Zero regressions

✅ **Phase 2: Advanced Declarators** - COMPLETE
- 10/10 diagnostics passing
- `ptrs[i]->field` fixed (including multiple accesses)
- Frame-size overlap bug fixed for struct arrays + pointer arrays

✅ **Phase 3: Initializers & Aggregates** - COMPLETE (initial target)
- Nested aggregate initializers validated
- Designated initializers implemented (`.field = value`, `[idx] = value`)
- Nested designated paths supported (`.inner.value`, `.arr[1]`)
- New diagnostics suite: `test-phase3-initializers-diagnosis.js` (7/7 pass)

✅ **Phase 4: Abstract Declarators Completeness** - COMPLETE (current target)
- Added typedef function-pointer alias handling in preprocessor alias collection
- New diagnostics suite: `test-phase4-abstract-declarators-diagnosis.js` (9/9 pass)
- Added Phase 4 diagnostics to `test-all.js`
- Added support for indexed parenthesized dereference forms (`(*p)[i]`, `(*arr[k])[i]`)

## Immediate TODO (High Priority)

### 1. Stabilize and Expand Phase 3 Coverage

**Status**: Core implementation complete, baseline diagnostics green.

**Implemented**:
- Parser support for designated initializer grammar (`designation`, `designatorList`, `designator`)
- Compiler support for designated paths and mixed designated/positional entries
- Zero-fill + override strategy for designated aggregates

**Next Checks**:
1. Add negative tests (invalid designators, out-of-bounds designator index)
2. Add matrix tests for multi-level nested aggregates in structs/arrays
3. Validate more enum-based array designators (`[ENUM_VALUE] = ...`)

### 2. Expand Phase 4 Coverage Beyond Current Practical Subset

**Status**: Baseline diagnostics green (6/6), additional complex forms pending.

**Next Checks**:
1. Validate additional multi-level declarator nesting edge cases from EBNF
2. Add more negative diagnostics for unsupported/ambiguous declarator forms
3. Extend coverage for complex pointer-to-array chains in structs and parameters

---

### 3. Update Conformance Matrix

**File**: `maiac/docs/C89_CONFORMANCE_MATRIX.md`

**Changes Needed**:
```
From: Declarations (partial)
To:   Declarations (done)
            - Arrays of pointers ✓
            - Pointers to functions ✓
            - Array of function pointers ✓
            - Abstract declarators ✓

From: Expressions (partial)
To:   Expressions (done)
            - Ptr-to-ptr arithmetic ✓
            - Pointer subtraction ✓

From: Control flow (partial)
To:   Control flow (done)
            - Unrestricted goto ✓

From: Initialization (partial)
To:   Initialization (done for current Phase 3 target)
            - Nested aggregate initializers ✓
            - Designated initializers (.field, [index]) ✓
            - Nested designated paths ✓
```

**Update Required Sections**:
- Table rows for declarators, expressions, statements
- Change "partial" to "done" for completed features
- Remove items from "Known compiler-side restriction signals" that are now fixed

---

### 4. Run Final Regression Tests

```bash
# Run all tests to ensure nothing broke
node compiler/tests/test-all.js

# Run diagnostic suites
node compiler/tests/test-error-points-diagnosis.js
node compiler/tests/test-phase2-declarators-diagnosis.js
node compiler/tests/test-phase3-initializers-diagnosis.js
node compiler/tests/test-phase4-abstract-declarators-diagnosis.js

# Expected: All pass with 0 failures
```

---

## Medium Term TODO (1-2 weeks)

### Phase 4: Abstract Declarators Completeness

**Scope**: Ensure all EBNF declarator forms compile

**Forms to Verify**:
- Function pointers with various signatures
- Arrays of function pointers
- Complex nested declarators
- Typedef'd declarators

---

### Phase 5: Preprocessor Edge Cases

**Scope**: Advanced preprocessor features

**Features**:
- Recursive macros
- Stringification (#)
- Token pasting (##)
- Conditional expressions in #if
- Multiple file includes with proper nesting

**Current Status**: In progress, baseline implemented and validated
- `#` stringification support added for function-like macros
- `##` token pasting support added for function-like macros
- New diagnostics suite: `test-phase5-preprocessor-edgecases.js` (4/4 pass)
- Architectural note: the preprocessor can be simplified further only after moving typedef/alias compatibility rewrites out of source-normalization and into parser/semantic handling

**Test Fixture**: Expanded with `test-phase5-preprocessor-edgecases.js`

---

## Testing Resources

### Existing Test Infrastructure

**Location**: `compiler/tests/`

**Test Files**:
- `test-c89-mini-suite.js` - 9 core C89 tests
- `test-error-points-diagnosis.js` - 14 error point tests (NEW)
- `test-phase2-declarators-diagnosis.js` - 10 advanced declarator tests (NEW)
- `test-phase3-initializers-diagnosis.js` - 7 initializer/aggregate diagnostics
- `test-phase4-abstract-declarators-diagnosis.js` - 9 declarator diagnostics
- `test-phase5-preprocessor-edgecases.js` - 4 preprocessor edge-case diagnostics
- `test-struct-ptr-debug.js` - Debug utility (NEW)
- `test-all.js` - Main test runner
- `test-preprocessor.js` - Preprocessor tests
- `test-large-example-e2e.js` - E2E test

**Test Examples**: `compiler/examples/c89-mini-suite/`

### How to Add New Tests

1. Create `test-phase-N-feature.js` in `compiler/tests/`
2. Define test cases with expected return values
3. Use pattern from existing tests
4. Add to `test-all.js` if needed for regression suite

### Running Tests

```bash
# Single test suite
node compiler/tests/test-error-points-diagnosis.js

# All tests  
node compiler/tests/test-all.js

# With report output
node compiler/tests/test-all.js --json-out report.json
```

---

## Code Navigation

### Key Functions to Know

**Parser/AST**:
- `compileExpression()` - Expression entry point
- `compileStatement()` - Statement handling
- `compileDeclaration()` - Declaration processing

**Type System**:
- `extractDeclarationTypeInfo()` - Type extraction
- `extractDeclaratorInfo()` - Declarator details
- `resolveMembersAccess()` - Struct/union field resolution

**Code Generation**:
- `compileLabeledStatement()` - Label handling
- `compileAdditiveExpression()` - Arithmetic ops (pointer support added here)
- `compileAggregateInitializerToAddress()` - Init code (struct copy added here)

**Problematic Area** (for next fix):
- Look around line 3300-3400 for `resolveLValue` and member access
- Check `getMemberAccessInfo` for struct field resolution through pointers

---

## Known Issues & Workarounds

### Issue 1: Keep parser regeneration aligned with current parser behavior
- **Status**: Build flow exists and now points to `compiler/c-parser.js`.
- Regeneration command:
    - `bash tools/build-c-parser.sh`
- Safe validation sequence after regeneration:
    - `node compiler/tests/test-phase3-initializers-diagnosis.js`
    - `node compiler/tests/test-phase4-abstract-declarators-diagnosis.js`
    - `node compiler/tests/test-phase5-preprocessor-edgecases.js`
    - `node compiler/tests/test-all.js`
- **Action**: Keep `grammar/C.ebnf` and generated `compiler/c-parser.js` in sync whenever parser changes are made.

### Issue 2: Pointer-to-array indexing via parenthesized dereference
- **Status**: Resolved in current Phase 4 scope
- Forms such as `(*p)[i]` and `(*arr[k])[i]` are now covered by diagnostics.

### Issue 3: Some Bitwise Operations
- **Status**: Already work but old code marked unsupported
- **Action**: Remove false error messages

---

## Code Quality Guidelines

### For Future Modifications

1. **Keep error messages explicit** - Current approach of throwing `CompilationError` with specific messages is good
2. **Add diagnostic tests first** - Create test, verify it fails, then implement
3. **Preserve existing functionality** - All tests must continue passing
4. **Update documentation** - Change comments/matrix when features are added
5. **Use consistent naming** - Follow existing patterns in codebase

### Pre-Commit Checklist

- [ ] All existing tests pass: `test-all.js`
- [ ] New diagnostic test created and passes
- [ ] No new "Unsupported" errors (or clear rationale)
- [ ] Code follows project style
- [ ] Comments updated for clarity
- [ ] Matrix/docs updated if scope changed

---

## Resources & References

### Key Files
- Grammar: `/Volumes/External_SSD/Documentos/Projects/maiac/grammar/C.ebnf`
- Main Compiler: `/Volumes/External_SSD/Documentos/Projects/maiac/compiler/c-compiler.js`
- Documentation: `/Volumes/External_SSD/Documentos/Projects/maiac/docs/`

### Related Projects
- Parser: `maiac/maiaccpp` - Parser generator  
- Assembler: `maiac/maiawasm` - WebAssembly backend
- Examples: `maiac/compiler/examples/`

### Documentation Created This Session
1. `CHANGELOG_PHASE1.md` - Detailed technical changes
2. `COMPLETION_REPORT_PHASE1.md` - High-level summary
3. `SESSION_SUMMARY.md` - Progress snapshot
4. `NEXT_STEPS.md` - This file

---

## Questions & Debugging

### How to Debug a Failing Test

```bash
# 1. Get more detail
MAIAC_WRITE_TEST_OUTPUTS=1 node compiler/tests/test-c89-mini-suite.js

# 2. Check generated WAT
ls compiler/tests/outputs/c89-mini-suite/

# 3. Read WAT source to understand issue
cat compiler/tests/outputs/c89-mini-suite/*.wat

# 4. Add console.log to c-compiler.js
# 5. Re-run test
node <test-file>
```

### How to Find Where an Error is Generated

```bash
# Search for the error message
grep -n "Unsupported expression node" compiler/c-compiler.js

# Look at surrounding context
# Add handling for that case
```

### How to Verify a Feature Works

```bash
# 1. Write simple test case
# 2. Compile with compileSource()
# 3. Run with WebAssembly.Instance()
# 4. Verify return value

# See test-struct-ptr-debug.js for example
```

---

## Contact Points

If questions arise:
- Check existing error handling patterns
- Look at working test cases first
- Read inline comments in c-compiler.js
- Follow pattern of similar features

---

**This is the end of the handoff document.**

Good luck with the next improvements! The foundation is solid and well-tested.

Happy coding! 🚀

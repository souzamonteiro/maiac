# MaiaC C89 EBNF - Implementation Audit and Pending Items

Date: 2026-04-09

## Objective Answer

No. MaiaC is not 100% implemented against the project's complete C89 EBNF.

The current state is a well-validated, practical subset that runs successfully, with semantic and codegen gaps for parts of the grammar.

## Observed Evidence

1. **Project Scope Statement**
   - The README itself defines the target as a "practical C89 subset".

2. **Current Tests**
   - Main test bundle passed:
     - preprocessor: 6/6
     - C89 mini-suite: 9/9
     - large E2E example: PASS
   - This proves maturity of the supported subset, not full EBNF coverage.

3. **Signs of Partial Coverage in the Compiler**
   - The `compiler/c-compiler.js` file contains several explicit non-support/limit points, for example:
     - "Unsupported statement type"
     - "Unsupported expression node"
     - "Only named function calls are supported right now"
     - "Nested aggregate initializers are not supported yet"
     - "Pointer-to-pointer arithmetic is not supported yet"
     - "Unsupported assignment target"
     - "Unsupported jump statement"

## Status Matrix by EBNF Family

Legend:
- done: implemented and covered in the current flow
- partial: implemented with restrictions
- missing: parse-level or no consistent semantic lowering

## A. Translation Unit and Declarations

- translationUnit / externalDeclaration: done
- functionDefinition: done
- declaration / declarationSpecifiers / initDeclaratorList: partial
- declarationList: partial

Pending Items:
- Complete complex declarators in all scenarios without semantic fallback.

## B. Types, Declarators, and Initialization

- builtinTypeSpecifier / typeQualifier: done
- basic struct/union/enum: done
- pointer/declarator/abstractDeclarator family: partial
- initializer / initializerList: partial

Pending Items:
- Complete nested aggregate initializers.
- Complete cases of abstract declarators and advanced combinations.
- Broader structural copy/init.

## C. Statements and Control Flow

- expressionStatement / compoundStatement: done
- if/else/switch/while/do/for: partial
- jumpStatement: partial
- labeledStatement: partial

Pending Items:
- Full goto coverage (currently restricted).
- Cover variations that currently trigger "Unsupported statement type".

## D. Expressions and Operators

- main hierarchy (arithmetic/logic/comparison): partial
- compound assignments: partial
- unary/postfix: partial
- function call: partial
- array/pointer/field access: partial

Pending Items:
- Expand supported assignment targets.
- Support more call forms (not just named function calls).
- Close gaps in operators and indexing/addressing cases.

## E. Struct/Union/Enum Semantics

- struct layout and field access: done/partial
- union and enum in mini-suite: done/partial

Pending Items:
- Expand structural access/assignment scenarios.
- Reduce "frame-backed locals and parameters" restrictions.

## F. Preprocessor

- define/undef/ifdef/ifndef/if/elif/else/endif/include: done (current scope)
- pragmas/lines and complex combinations: partial

Pending Items:
- Consolidate coverage of edge cases in macro expansion and include.

## G. WAT/WASM Integration

- WAT generation + validation + Node/browser execution: done (subset)
- Equivalence for 100% of EBNF: partial

Pending Items:
- Expand semantic equivalence tests by rule family.

## Priority Pending Items (Roadmap)

## Priority P0 - Close Explicit Non-Support Gaps

- [ ] Eliminate the most frequent cases of "Unsupported statement type".
- [ ] Eliminate the most frequent cases of "Unsupported expression node".
- [ ] Support more assignment targets (beyond the current set).

Acceptance Criteria:
- Reduce the above errors to zero for the defined conformance fixture set.

## Priority P1 - Declarators and Initializers

- [ ] Fully cover complex declarator/abstractDeclarator.
- [ ] Implement complete nested aggregate initializers.
- [ ] Complete structural initialization/copy scenarios.

Acceptance Criteria:
- Specific EBNF rule fixtures for declarators and initializers passing.

## Priority P2 - Complete Control Flow

- [ ] Complete goto and label semantics without form restrictions.
- [ ] Complete remaining for/switch/jump cases in real combinations.

Acceptance Criteria:
- Expanded mini-suite with control cases covering the entire statement family.

## Priority P3 - Advanced Expressions

- [ ] Complete operator/fixity matrix with fixture coverage.
- [ ] Complete indirect calls and advanced function pointer scenarios.

Acceptance Criteria:
- Dedicated expression suite without "unsupported".

## Priority P4 - Formal Rule-by-Rule Conformance

- [ ] Create C89 rule-by-rule matrix (parse, semantics, codegen, runtime).
- [ ] Classify each rule into tiers:
  - Tier 1: parse + compile + run
  - Tier 2: parse + compile (partial runtime)
  - Tier 3: parse-only (with technical justification)

Acceptance Criteria:
- 100% of EBNF families classified and associated with a test.

## Definition of Done for "100%"

To claim 100% implementation, each relevant EBNF family must have:

1. Parser accepts
2. Semantics resolve
3. Lowering/codegen generates valid WAT
4. Runtime behavior validated by a fixture

Without all four items, the state is a supported subset, not full coverage.
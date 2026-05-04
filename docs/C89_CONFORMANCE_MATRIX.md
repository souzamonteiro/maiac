# MaiaC C89 Conformance Matrix

Date: 2026-05-04

Scope:
- Grammar source: grammar/C.ebnf
- Compiler implementation: compiler/c-compiler.js
- Runtime evidence: compiler/tests/test-all.js
- Additional diagnostics: compiler/tests/test-phase2-declarators-diagnosis.js, compiler/tests/test-phase3-initializers-diagnosis.js, compiler/tests/test-phase4-abstract-declarators-diagnosis.js, compiler/tests/test-phase5-preprocessor-edgecases.js, compiler/tests/test-argv-pointer-regressions.js, compiler/tests/test-struct-assignment-by-value.js

Status legend:
- done: implemented and validated in current flow
- partial: implemented with known restrictions
- missing: parser rule exists but semantic/lowering is absent or not validated

Tier legend:
- Tier 1: parse + compile + run
- Tier 2: parse + compile (runtime constrained)
- Tier 3: parse-only / unsupported in current lowering

## Current global evidence

- Full test bundle: PASS (19 sub-scripts, 0 failures)
- Phase 2 declarators diagnostics: 10/10 PASS
- Phase 3 initializers diagnostics: 12/12 PASS
- Phase 4 abstract declarators diagnostics: 13/13 PASS
- Phase 5 preprocessor edge cases: 10/10 PASS
- Argv/pointer regression tests: 3/3 PASS
- Struct assignment by value tests: 3/3 PASS
- Project target remains practical C89 subset, not full-language completeness claim.

## Rule-family matrix

| Family | Grammar rules (C.ebnf) | Parse | Semantic | Codegen | Runtime | Tier | Notes |
|---|---|---|---|---|---|---|---|
| Translation unit | translationUnit, translationUnitItem, externalDeclaration | done | done | done | done | Tier 1 | Core pipeline validated by test-all. |
| Function definitions | functionDefinition, declarationList | done | partial | partial | partial | Tier 2 | Works for covered subset; some constructs still rejected downstream. |
| Declarations | declaration, declarationSpecifiers, initDeclaratorList, initDeclarator | done | done | done | done | Tier 1 | Advanced declarators validated by phase2 diagnostics (arrays of pointers, function pointers, pointer chains, multidimensional arrays). |
| Storage/type qualifiers | storageClassSpecifier, typeQualifier | done | partial | partial | partial | Tier 2 | Qualifiers parse, but semantic enforcement is limited in backend behavior. |
| Builtin and named types | builtinTypeSpecifier, namedTypeSpecifier, typedefName | done | partial | partial | partial | Tier 2 | Typedef and named-type scenarios supported in subset; edge cases remain. |
| Struct/union declarations | structOrUnionSpecifier, structDeclarationList, structDeclaratorList | done | partial | partial | partial | Tier 2 | Layout/access and struct copy assignment by value validated (b=a, b.field=a.field, *pb=*pa); some member update/edge paths remain partial. |
| Enum declarations | enumSpecifier, enumeratorList | done | partial | partial | partial | Tier 2 | Mini-suite covers practical enum cases. |
| Declarator system | declarator, directDeclaratorBase, directDeclaratorSuffix, pointer, parameterTypeList, abstractDeclarator | done | done | done | done | Tier 1 | Phase2 diagnostics validate covered advanced forms in current practical subset. |
| Initializers | initializer, initializerList | done | done | done | done | Tier 1 | Nested aggregates and designated initializers (.field, [index], nested designated paths) validated by phase3 diagnostics. |
| Compound blocks | compoundStatement, blockItem, statementList | done | done | done | done | Tier 1 | Strongly covered by mini-suite and large E2E. |
| Selection statements | selectionStatement, labeledStatement | done | partial | partial | partial | Tier 2 | if/switch available; some statement forms still hit unsupported branches. |
| Iteration statements | iterationStatement | done | partial | partial | partial | Tier 2 | while/do/for supported in subset; malformed/edge combinations guarded by errors. |
| Jump statements | jumpStatement | done | done | done | done | Tier 1 | Unrestricted goto path is implemented and validated in diagnostic suites. |
| Expression hierarchy | expression through multiplicativeExpression | done | done | done | done | Tier 1 | Pointer subtraction and key declarator-driven expression paths validated in current suite set. |
| Assignment operators | assignmentExpression, assignmentOperator | done | partial | partial | partial | Tier 2 | Simple and struct-copy assignments validated (direct, field, pointer-dereference forms); compound assignment operators and some complex targets remain constrained. |
| Unary and postfix | unaryExpression, unaryOperator, postfixExpression, postfixSuffix | done | partial | partial | partial | Tier 2 | Includes explicit restrictions on some unary/index/call forms. |
| Primary/constants | primaryExpression, constant, IntegerConstant, FloatingConstant, CharacterConstant, StringLiteral | done | done | done | done | Tier 1 | Broadly exercised in suites. |
| Function calls | postfixSuffix with call, argumentExpressionList | done | partial | partial | partial | Tier 2 | Current implementation restricts to named function calls in some paths. |
| Preprocessor directives | PreprocessingDirective and Pp* rules | done | partial | partial | partial | Tier 2 | Core directives, stringification (#), and token pasting (##) covered by Phase 5 diagnostics; conditional expressions in #if and multi-file include nesting still need expansion. |
| Comments/whitespace/tokens | Ignore, WhiteSpace, Comment, lexical token rules | done | done | done | done | Tier 1 | Stable in parser and test execution. |

## Known compiler-side restriction signals (evidence)

Representative limitations currently present in compiler/c-compiler.js:
- Unsupported statement type
- Unsupported expression node
- Only named function calls are supported right now
- Unsupported assignment target
- Unsupported jump statement

Note: All bitwise operations (`&`, `|`, `^`, `~`, `<<`, `>>`) are fully implemented and validated. No false-positive error signals remain for bitwise operators.

## Priority backlog derived from matrix

1. Close remaining unsupported statement/expression branches (highest impact).
2. Broaden assignment targets and compound-assignment support.
3. Expand function-call forms beyond current named-call restrictions.
4. Add negative diagnostics for designated initializer error paths (Phase 3 coverage expansion).
5. Expand Phase 4 multi-level declarator nesting and pointer-to-array chains.

## Exit criteria for 100 percent claim

A family can be marked done only when all conditions below are true:
1. Parser accepts representative and edge grammar forms.
2. Semantic analyzer resolves symbols/types/scopes for those forms.
3. Lowering/codegen emits valid WAT/WASM for those forms.
4. Runtime fixtures validate expected behavior.

Without all four, the family remains partial even if parsing succeeds.

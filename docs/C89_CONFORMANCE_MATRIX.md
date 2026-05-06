# MaiaC C89 Conformance Matrix

Date: 2026-05-05

Scope:
- Grammar source: grammar/C.ebnf
- Compiler implementation: compiler/c-compiler.js
- Runtime evidence: compiler/tests/test-all.js
- Additional diagnostics: compiler/tests/test-phase2-declarators-diagnosis.js, compiler/tests/test-phase3-initializers-diagnosis.js, compiler/tests/test-phase4-abstract-declarators-diagnosis.js, compiler/tests/test-phase5-preprocessor-edgecases.js, compiler/tests/test-phase6-selection-statements-diagnosis.js, compiler/tests/test-phase7-iteration-statements-diagnosis.js, compiler/tests/test-phase8-unary-postfix-diagnosis.js, compiler/tests/test-phase9-preprocessor-advanced-diagnosis.js, compiler/tests/test-argv-pointer-regressions.js, compiler/tests/test-struct-assignment-by-value.js

Status legend:
- done: implemented and validated in current flow
- partial: implemented with known restrictions
- missing: parser rule exists but semantic/lowering is absent or not validated

Tier legend:
- Tier 1: parse + compile + run
- Tier 2: parse + compile (runtime constrained)
- Tier 3: parse-only / unsupported in current lowering

## Current global evidence

- Full test bundle: PASS (23 sub-scripts, 0 failures)
- Phase 2 declarators diagnostics: 10/10 PASS
- Phase 3 initializers diagnostics: 18/18 PASS
- Phase 4 abstract declarators diagnostics: 23/23 PASS
- Phase 5 preprocessor edge cases: 16/16 PASS
- Phase 6 selection statements diagnostics: 20/20 PASS
- Phase 7 iteration statements diagnostics: 13/13 PASS
- Phase 8 unary/postfix diagnostics: 22/22 PASS
- Phase 9 preprocessor advanced diagnostics: 9/9 PASS
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
| Selection statements | selectionStatement, labeledStatement | done | done | done | done | Tier 1 | if/else, if-else-if chains, switch with fall-through/break/default, ternary operator, and complex logical conditions all validated by Phase 6 diagnostics. |
| Iteration statements | iterationStatement | done | done | done | done | Tier 1 | while, do-while, for loops with all common patterns validated; nested loops, loop control (break/continue), and appropriate error rejection all covered by Phase 7 diagnostics. |
| Jump statements | jumpStatement | done | done | done | done | Tier 1 | Unrestricted goto path is implemented and validated in diagnostic suites. |
| Expression hierarchy | expression through multiplicativeExpression | done | done | done | done | Tier 1 | Pointer subtraction and key declarator-driven expression paths validated in current suite set. |
| Assignment operators | assignmentExpression, assignmentOperator | done | done | done | done | Tier 1 | All 10 compound operators (+=,-=,*=,/=,%=,&=,|=,^=,<<=,>>=) validated on scalars, struct fields (.x, ->x), array elements (arr[i]) and pointer dereferences (*p). Comma operator in expressions validated. |
| Unary and postfix | unaryExpression, unaryOperator, postfixExpression, postfixSuffix | done | partial | partial | partial | Tier 2 | Broad unary/postfix coverage validated in Phase 8 (++, --, !, ~, &, *, sizeof, index/call/dot/arrow); known restriction remains for address-of global variables in current lowering. |
| Primary/constants | primaryExpression, constant, IntegerConstant, FloatingConstant, CharacterConstant, StringLiteral | done | done | done | done | Tier 1 | Broadly exercised in suites. |
| Function calls | postfixSuffix with call, argumentExpressionList | done | done | done | done | Tier 1 | Named calls, fn-ptr calls ((*fp)(args), fp(args)), chained calls (getOp()(args)), fn-ptr in struct (o.op(args)), array-of-fn-ptrs (ops[i](args)), fn returning fn-ptr without typedef all validated. |
| Preprocessor directives | PreprocessingDirective and Pp* rules | done | partial | partial | partial | Tier 2 | Core directives plus #elif, #undef, #ifdef/#ifndef, defined with/without parentheses, recursive include guards, and line-continuation macros covered by Phases 5 and 9; known gaps remain in macro-expanded #if expressions and composed token-pasting expansions. |
| Comments/whitespace/tokens | Ignore, WhiteSpace, Comment, lexical token rules | done | done | done | done | Tier 1 | Stable in parser and test execution. |

## Known compiler-side restriction signals (evidence)

Representative limitations currently present in compiler/c-compiler.js:
- Unsupported statement type (unreachable grammar alternatives)
- Unsupported expression node (unreachable grammar alternatives)
- Unsupported assignment target (complex lvalue forms not yet lowered)
- Unsupported jump statement (unreachable grammar alternatives)

Resolved signals (removed from active concern):
- ~~Only named function calls are supported right now~~ — fn-ptr and chained calls now work
- ~~Compound assignment operators remain constrained~~ — all 10 operators validated on all target forms

Note: All bitwise operations (`&`, `|`, `^`, `~`, `<<`, `>>`) are fully implemented and validated. No false-positive error signals remain for bitwise operators.

## Priority backlog derived from matrix

1. ~~Close remaining unsupported statement/expression branches~~ — compound assignment and fn-call forms completed 2026-05-05.
2. ~~Broaden assignment targets and compound-assignment support~~ — completed 2026-05-05.
3. ~~Expand function-call forms beyond current named-call restrictions~~ — completed 2026-05-05.
4. ~~Add negative diagnostics for designated initializer error paths (Phase 3 coverage expansion).~~ — completed 2026-05-05.
5. ~~Expand Phase 4 multi-level declarator nesting and pointer-to-array chains.~~ — completed 2026-05-05.
6. ~~Fix `sizeof` for `short` (2), `long` (4), and local struct declarations.~~ — completed 2026-05-05.
7. ~~Expand Phase 5 preprocessor edge cases (#elif/#undef/#ifdef/#ifndef + recursive includes).~~ — completed 2026-05-05.
8. ~~Expand Phase 6 selection statement coverage (if/else-if/switch/ternary/error cases).~~ — completed 2026-05-05.
9. ~~Expand Phase 7 iteration statement coverage (while/do-while/for/nested/break-continue).~~ — completed 2026-05-05.
10. ~~Expand Phase 8 unary/postfix coverage (++/--, dereference/address-of local, indexing, sizeof, dot/arrow, negatives).~~ — completed 2026-05-05.
11. ~~Expand Phase 9 advanced preprocessor coverage (#if/#elif advanced chains, line continuation, limitation diagnostics).~~ — completed 2026-05-05.

## Exit criteria for 100 percent claim

A family can be marked done only when all conditions below are true:
1. Parser accepts representative and edge grammar forms.
2. Semantic analyzer resolves symbols/types/scopes for those forms.
3. Lowering/codegen emits valid WAT/WASM for those forms.
4. Runtime fixtures validate expected behavior.

Without all four, the family remains partial even if parsing succeeds.

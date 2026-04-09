# MaiaC C89 Conformance Matrix

Date: 2026-04-09

Scope:
- Grammar source: grammar/C.ebnf
- Compiler implementation: compiler/c-compiler.js
- Runtime evidence: compiler/tests/test-all.js

Status legend:
- done: implemented and validated in current flow
- partial: implemented with known restrictions
- missing: parser rule exists but semantic/lowering is absent or not validated

Tier legend:
- Tier 1: parse + compile + run
- Tier 2: parse + compile (runtime constrained)
- Tier 3: parse-only / unsupported in current lowering

## Current global evidence

- Full test bundle: PASS (preprocessor, mini-suite C89, large E2E)
- Project target remains practical C89 subset, not full-language completeness claim.

## Rule-family matrix

| Family | Grammar rules (C.ebnf) | Parse | Semantic | Codegen | Runtime | Tier | Notes |
|---|---|---|---|---|---|---|---|
| Translation unit | translationUnit, translationUnitItem, externalDeclaration | done | done | done | done | Tier 1 | Core pipeline validated by test-all. |
| Function definitions | functionDefinition, declarationList | done | partial | partial | partial | Tier 2 | Works for covered subset; some constructs still rejected downstream. |
| Declarations | declaration, declarationSpecifiers, initDeclaratorList, initDeclarator | done | partial | partial | partial | Tier 2 | Complex declarators and some init forms still constrained. |
| Storage/type qualifiers | storageClassSpecifier, typeQualifier | done | partial | partial | partial | Tier 2 | Qualifiers parse, but semantic enforcement is limited in backend behavior. |
| Builtin and named types | builtinTypeSpecifier, namedTypeSpecifier, typedefName | done | partial | partial | partial | Tier 2 | Typedef and named-type scenarios supported in subset; edge cases remain. |
| Struct/union declarations | structOrUnionSpecifier, structDeclarationList, structDeclaratorList | done | partial | partial | partial | Tier 2 | Layout/access works in many cases; strict limits appear in some member access/update paths. |
| Enum declarations | enumSpecifier, enumeratorList | done | partial | partial | partial | Tier 2 | Mini-suite covers practical enum cases. |
| Declarator system | declarator, directDeclaratorBase, directDeclaratorSuffix, pointer, parameterTypeList, abstractDeclarator | done | partial | partial | partial | Tier 2 | Not all nested/abstract combinations are fully lowered. |
| Initializers | initializer, initializerList | done | partial | partial | partial | Tier 2 | Nested aggregate initializers still explicitly unsupported in compiler paths. |
| Compound blocks | compoundStatement, blockItem, statementList | done | done | done | done | Tier 1 | Strongly covered by mini-suite and large E2E. |
| Selection statements | selectionStatement, labeledStatement | done | partial | partial | partial | Tier 2 | if/switch available; some statement forms still hit unsupported branches. |
| Iteration statements | iterationStatement | done | partial | partial | partial | Tier 2 | while/do/for supported in subset; malformed/edge combinations guarded by errors. |
| Jump statements | jumpStatement | done | partial | partial | partial | Tier 2 | return/break/continue mostly covered; goto currently restricted. |
| Expression hierarchy | expression through multiplicativeExpression | done | partial | partial | partial | Tier 2 | Main arithmetic/logical chain works for tested subset; unsupported expression nodes remain. |
| Assignment operators | assignmentExpression, assignmentOperator | done | partial | partial | partial | Tier 2 | Several assignment targets/operators remain constrained. |
| Unary and postfix | unaryExpression, unaryOperator, postfixExpression, postfixSuffix | done | partial | partial | partial | Tier 2 | Includes explicit restrictions on some unary/index/call forms. |
| Primary/constants | primaryExpression, constant, IntegerConstant, FloatingConstant, CharacterConstant, StringLiteral | done | done | done | done | Tier 1 | Broadly exercised in suites. |
| Function calls | postfixSuffix with call, argumentExpressionList | done | partial | partial | partial | Tier 2 | Current implementation restricts to named function calls in some paths. |
| Preprocessor directives | PreprocessingDirective and Pp* rules | done | partial | partial | partial | Tier 2 | Core directives covered by tests; advanced combinations still need expansion. |
| Comments/whitespace/tokens | Ignore, WhiteSpace, Comment, lexical token rules | done | done | done | done | Tier 1 | Stable in parser and test execution. |

## Known compiler-side restriction signals (evidence)

Representative limitations currently present in compiler/c-compiler.js:
- Unsupported statement type
- Unsupported expression node
- Only named function calls are supported right now
- Nested aggregate initializers are not supported yet
- Pointer-to-pointer arithmetic is not supported yet
- Unsupported assignment target
- Unsupported jump statement

These signals are consistent with partial status in multiple matrix families.

## Priority backlog derived from matrix

1. Close unsupported statement/expression branches first (highest impact).
2. Complete declarator and initializer coverage (especially nested aggregates and abstract declarators).
3. Broaden assignment targets and function-call forms.
4. Remove goto and jump restrictions.
5. Expand preprocessor edge-case suite and rule-by-rule fixtures.

## Exit criteria for 100 percent claim

A family can be marked done only when all conditions below are true:
1. Parser accepts representative and edge grammar forms.
2. Semantic analyzer resolves symbols/types/scopes for those forms.
3. Lowering/codegen emits valid WAT/WASM for those forms.
4. Runtime fixtures validate expected behavior.

Without all four, the family remains partial even if parsing succeeds.

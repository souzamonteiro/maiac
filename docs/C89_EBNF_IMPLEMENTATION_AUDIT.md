# MaiaC C89 EBNF - Auditoria de Implementacao e Pendencias

Data: 2026-04-09

## Resposta objetiva

Nao. O MaiaC nao esta 100 por cento implementado contra toda a EBNF do C89 do projeto.

O estado atual e de subconjunto pratico bem validado em execucao, com lacunas semanticas e de codegen para partes da gramatica.

## Evidencias observadas

1. Escopo declarado no projeto
- O proprio README define o alvo como "practical C89 subset".

2. Testes atuais
- Bundle principal passou:
  - preprocessor: 6/6
  - mini-suite C89: 9/9
  - exemplo grande E2E: PASS
- Isso comprova maturidade do subconjunto suportado, nao cobertura total da EBNF.

3. Sinais de cobertura parcial no compilador
- O arquivo compiler/c-compiler.js contem varios pontos explicitos de nao-suporte/limite, por exemplo:
  - "Unsupported statement type"
  - "Unsupported expression node"
  - "Only named function calls are supported right now"
  - "Nested aggregate initializers are not supported yet"
  - "Pointer-to-pointer arithmetic is not supported yet"
  - "Unsupported assignment target"
  - "Unsupported jump statement"

## Matriz de status por familia da EBNF

Legenda:
- done: implementado e coberto no fluxo atual
- partial: implementado com restricoes
- missing: parse-level ou sem lowering semantico consistente

## A. Translation Unit e Declaracoes

- translationUnit / externalDeclaration: done
- functionDefinition: done
- declaration / declarationSpecifiers / initDeclaratorList: partial
- declarationList: partial

Pendencias:
- completar declaradores complexos em todos os cenarios sem fallback semantico.

## B. Tipos, Declaradores e Inicializacao

- builtinTypeSpecifier / typeQualifier: done
- struct/union/enum basicos: done
- pointer/declarator/abstractDeclarator family: partial
- initializer / initializerList: partial

Pendencias:
- inicializadores agregados aninhados completos.
- casos completos de declaradores abstratos e combinacoes avancadas.
- copy/init estrutural mais amplo.

## C. Statements e Fluxo de Controle

- expressionStatement / compoundStatement: done
- if/else/switch/while/do/for: partial
- jumpStatement: partial
- labeledStatement: partial

Pendencias:
- cobertura total de goto (hoje restrito).
- cobrir variacoes que hoje disparam "Unsupported statement type".

## D. Expressoes e Operadores

- hierarquia principal (aritmetica/logica/comparacao): partial
- atribuicoes compostas: partial
- unary/postfix: partial
- chamada de funcao: partial
- acesso array/ponteiro/campo: partial

Pendencias:
- ampliar alvo de atribuicao suportado.
- suportar mais formas de chamada (nao apenas named function calls).
- fechar lacunas de operadores e casos de indexacao/enderecamento.

## E. Struct/Union/Enum Semantica

- layout de struct e acesso a campos: done/partial
- union e enum no mini-suite: done/partial

Pendencias:
- ampliar cenarios de acesso/atribuicao estrutural.
- reduzir restricoes de "frame-backed locals and parameters".

## F. Preprocessador

- define/undef/ifdef/ifndef/if/elif/else/endif/include: done (escopo atual)
- pragmas/linhas e combinacoes complexas: partial

Pendencias:
- consolidar cobertura de casos limítrofes de macro expansion e include.

## G. Integração WAT/WASM

- geracao WAT + validacao + execucao Node/browser: done (subconjunto)
- equivalencia para 100 por cento da EBNF: partial

Pendencias:
- expandir testes de equivalencia semantica por familia de regra.

## Pendencias prioritarias (roadmap)

## Prioridade P0 - Fechar lacunas de nao-suporte explicito

- [ ] Eliminar os casos mais frequentes de "Unsupported statement type".
- [ ] Eliminar os casos mais frequentes de "Unsupported expression node".
- [ ] Suportar mais alvos de atribuicao (alem do conjunto atual).

Criterio de aceite:
- reduzir a zero os erros acima para o conjunto de fixtures de conformidade definido.

## Prioridade P1 - Declaradores e inicializadores

- [ ] Cobrir declarator/abstractDeclarator complexos de forma total.
- [ ] Implementar nested aggregate initializers completos.
- [ ] Completar cenarios de inicializacao/copias estruturais.

Criterio de aceite:
- fixtures especificos por regra da EBNF para declaradores e inicializadores passando.

## Prioridade P2 - Fluxo de controle completo

- [ ] Completar semantica de goto e labels sem restricao de forma.
- [ ] Completar casos restantes de for/switch/jump em combinacoes reais.

Criterio de aceite:
- mini-suite expandido com casos de controle cobrindo toda familia de statements.

## Prioridade P3 - Expressoes avancadas

- [ ] Completar matriz de operadores/fixidade com cobertura por fixture.
- [ ] Completar chamadas indiretas e cenarios de ponteiros para funcao avancados.

Criterio de aceite:
- suite dedicada de expressoes sem "unsupported".

## Prioridade P4 - Conformidade formal por regra

- [ ] Criar matriz C89 regra-a-regra (parse, semantica, codegen, runtime).
- [ ] Classificar cada regra em tiers:
  - Tier 1: parse + compile + run
  - Tier 2: parse + compile (runtime parcial)
  - Tier 3: parse-only (com justificativa tecnica)

Criterio de aceite:
- 100 por cento das familias da EBNF classificadas e com teste associado.

## Definicao de pronto para "100 por cento"

Para afirmar 100 por cento implementado, cada familia relevante da EBNF deve ter:

1. parser aceita
2. semantica resolve
3. lowering/codegen gera WAT valido
4. comportamento em runtime validado por fixture

Sem os quatro itens, o estado e subconjunto suportado, nao cobertura total.

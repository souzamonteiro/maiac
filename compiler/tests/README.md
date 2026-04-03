# C Parser Test Suite (REx)

This suite validates the parser generated from `grammar/C.ebnf` by:

1. Parsing C fixtures with `C-main.js`
2. Generating XML parse trees
3. Checking XML structural correctness (well-formed tags)
4. Asserting expected grammar elements per fixture
5. Asserting expected failures for invalid fixtures

## Run

```bash
cd /Volumes/External_SSD/Documentos/Projects/maiascript-compiler/cc
node tests/run-parser-tests.js
```

## Fixture layout

- `tests/fixtures/positive/*.c` valid samples
- `tests/fixtures/negative/*.c` invalid samples
- `tests/manifest.json` expectations (`expectTags`, `expectError`)
- `tests/output/**/*.xml` generated parse trees

## Add new fixture

1. Create a new `.c` file under positive or negative.
2. Add an entry in `tests/manifest.json`.
3. Re-run test suite.

For positive cases, include meaningful `expectTags` to verify grammar coverage.

## Robust coverage notes

- `positive/13-complete-program-with-preprocessor.c` is a full-program style fixture (types + control flow) designed to stay compatible with the current grammar.
- `negative/05-preprocessing-directive.c` explicitly captures the current preprocessing-directive limitation as an expected failure.

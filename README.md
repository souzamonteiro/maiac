# MaiaC
Maia C Compiler.

## Bootstrap

Generate parser from EBNF using MaiaCC:

```bash
bash tools/build-c-parser.sh
```

Generate Emscripten WAT reference templates from C examples:

```bash
bash tools/gen-emscripten-wat-templates.sh
```

More details: [docs/MAIAC_BOOTSTRAP.md](docs/MAIAC_BOOTSTRAP.md)

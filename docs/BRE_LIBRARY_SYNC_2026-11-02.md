# Additive BRE dependency propagation

2026-11-02. Root gitlinks MaiaCCfe00596, MaiaWASM8f5d02b and MaiaRegex8a1dcbf
were recorded after completed git_pull and before downstream tests. No MaiaC
implementation/grammar/generated parser change. The ordered lexer runtime
remains byte-identical; these tests preserve compiler behavior, not new BRE use.

npm run test:full passed the complete bundle plus13 extra scripts. npm run
compile:example passed; separate own-chain rebuild validates as WebAssembly
at23,395bytes. All36 tracked example JSON diffs were reviewed after parsing:
only generatedAt/input metadata changed; executable artifacts are unchanged.
They are retained under the owner's versioned-example artifact policy.

Regex's development-only tools/maiacpp is intentionally uninitialized in these
consumer checkouts (`update=none`), preserving its fixed historical graph. The
recorded toolchain pin/lock are published and verified in principal Regex.
No npm/version/history change or root MaiaOS publication.

# tree-sitter-powershell

## Generating the parser

- **Always use `npm run generate`** — it pins `--abi 14` and also regenerates `node_types.go` via `tree-sitter-go-types`. Never run bare `tree-sitter generate`; CLI ≥0.26 defaults to ABI 15, which breaks `go-tree-sitter v0.24.0` consumers with `Incompatible language version 15. Expected minimum 13, maximum 14`.
- The go-compat CI job fails any PR where `src/parser.c` `LANGUAGE_VERSION` != 14.
- Only the committed `src/parser.c` needs ABI 14. The npm/crates/pypi publish workflows regenerate at the CLI default (ABI 15); their runtimes accept newer ABIs.
- Always commit `src/parser.c`, `src/grammar.json`, `src/node-types.json`, `src/tree_sitter/parser.h`, and `src/tree_sitter/array.h` together. They must come from the same CLI invocation — mismatched `parser.c` / `parser.h` fails to compile with `error: unknown type name 'TSMapSlice'` or similar.

## Testing

- Corpus: `tree-sitter test` (optionally `--file-name <file>.txt`, `--overview-only`, `-i <regex>`).
- Fixture parse check: `tree-sitter parse test/fixtures/<file>.ps1` — exit non-zero on `ERROR` / `MISSING`.
- Reliable error count in scripts: `grep -cE '\(ERROR|\(MISSING' output.txt || true` (bare `grep -c` returns exit 1 on zero matches).
- `npm test` is broken on `main` (missing `tree-sitter` peer dep) — ignore; rely on `tree-sitter test` and `go test ./...`.

## Versioning and release

- `tree-sitter.json` `metadata.version` tracks the **grammar** version. `package.json` / `Cargo.toml` / `Makefile` track package release versions and are **intentionally decoupled** — do not sync them unless asked.
- Pushing a `v*` tag fires three publish workflows: crates.io, npm, pypi. Each reads the version from `tree-sitter.json` at publish time.
- `main` branch ruleset: requires 1 approving review; only `squash` and `rebase` merges allowed; admins can bypass with `gh pr merge --admin`.

## CI jobs

- `test` — `tree-sitter test` (corpus).
- `parse-sample` — downloads `TheBigTestFile.ps1` from `PowerShell/EditorSyntax`; fails when `grep -c 'ERROR'` output **exceeds 12**. Lower the threshold as errors are fixed.
- `parse-pscx` — parses `test/fixtures/Pscx.Utility.psm1` with `set -o pipefail` and requires **zero** `ERROR`/`MISSING` nodes.
- `go-compat` — uses pinned `go-tree-sitter v0.24.0`; the canary that catches ABI bumps.

## Grammar patterns

- Generic token rule: `/[^\(\)\$\"\'\-\{\}@\|\[`\&\s][^\&\s\(\)\}\|;,]*/` — the exclusion set at the start is stricter than the interior; mirror this when introducing new bareword-like rules.
- When introducing a rule that can be lexed ambiguously with an existing one (e.g. `expandable_bareword` vs `element_access`), exclude the ambiguity-triggering leading chars (`[`, `{`, `.`, `$`, `"`, `'`, backtick) from the new rule's leading character class. Add regression tests that exercise the existing form in the same context.

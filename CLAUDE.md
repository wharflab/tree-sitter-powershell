# tree-sitter-powershell

## Generating the parser

- **Use the pinned CLI**: `node_modules/.bin/tree-sitter generate` — the globally installed `tree-sitter` will produce wrong ABI.
- `npm run generate` also regenerates `node_types.go` via `tree-sitter-go-types`. Prefer it over bare `tree-sitter generate` when grammar changes affect node types.
- Pinned CLI is `tree-sitter-cli@0.24.7` → emits `LANGUAGE_VERSION 14`. Do not ship `LANGUAGE_VERSION 15` — downstream Go consumers on `go-tree-sitter v0.24.0` reject it with `Incompatible language version 15`.
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

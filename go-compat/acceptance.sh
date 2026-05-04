#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The smoke module under go-compat/smoke pins go-tree-sitter to the
# oldest runtime that downstream consumers (e.g. github.com/wharflab/tally)
# still ship (see go-compat/smoke/go.mod). Running the smoke test against
# that pinned runtime catches any ABI bump that would break pinned
# consumers.
abi="$(awk '/^#define LANGUAGE_VERSION/ { print $3; exit }' "$repo_root/src/parser.c")"
echo "parser.c ABI (on disk): $abi"
echo "src/parser.c: $repo_root/src/parser.c"

cd "$repo_root/go-compat/smoke"

# Confirm `replace` is picking up this checkout and not a proxy-cached
# copy of the released grammar. If this ever resolves to $GOMODCACHE,
# the build will compile against whatever parser.c the proxy cached
# (which is why PR #17 initially reported ABI 15 incorrectly even after the
# fix landed).
resolved_dir="$(go list -m -f '{{.Dir}}' github.com/wharflab/tree-sitter-powershell)"
echo "github.com/wharflab/tree-sitter-powershell resolved to: $resolved_dir"
expected_dir="$(cd "$repo_root" && pwd -P)"
if [ "$(cd "$resolved_dir" && pwd -P)" != "$expected_dir" ]; then
  echo "ERROR: replace directive did not resolve to repo root." >&2
  echo "  expected: $expected_dir" >&2
  echo "  got:      $(cd "$resolved_dir" && pwd -P)" >&2
  exit 1
fi

CGO_ENABLED=1 go run .

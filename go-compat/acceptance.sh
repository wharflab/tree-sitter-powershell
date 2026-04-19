#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The smoke module under go-compat/smoke pins go-tree-sitter to the
# oldest runtime that downstream consumers (e.g. github.com/wharflab/tally)
# still ship (see go-compat/smoke/go.mod). Running the smoke test against
# that pinned runtime catches any ABI bump that would break pinned
# consumers.
abi="$(awk '/^#define LANGUAGE_VERSION/ { print $3; exit }' "$repo_root/src/parser.c")"
echo "parser.c ABI: $abi (from $repo_root/src/parser.c)"

cd "$repo_root/go-compat/smoke"
CGO_ENABLED=1 go run .

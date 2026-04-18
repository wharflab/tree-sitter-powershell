#!/usr/bin/env bash
set -euo pipefail

# Pin the go-tree-sitter runtime that downstream consumers (e.g.
# github.com/wharflab/tally) actually use.  Its oldest supported
# release accepts tree-sitter ABI 13-14 only; newer releases accept
# ABI 15+.  Running the acceptance test against this pinned version
# catches any ABI bump that would break pinned consumers.
GO_TREE_SITTER_VERSION="${GO_TREE_SITTER_VERSION:-v0.24.0}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cat >"$tmpdir/go.mod" <<EOF
module tree_sitter_powershell_go_compat_smoke

go 1.23

require (
	github.com/tree-sitter/go-tree-sitter ${GO_TREE_SITTER_VERSION}
	github.com/wharflab/tree-sitter-powershell v0.0.0
)

replace github.com/wharflab/tree-sitter-powershell => $repo_root
EOF

mkdir -p "$tmpdir/smoke"
cp "$repo_root/go-compat/smoke/main.go" "$tmpdir/smoke/main.go"

(
  cd "$tmpdir"
  GO111MODULE=on go mod tidy
  cd smoke
  CGO_ENABLED=1 go run .
)

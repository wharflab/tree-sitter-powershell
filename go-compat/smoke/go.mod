module tree_sitter_powershell_go_compat_smoke

go 1.23

// Pin go-tree-sitter to the oldest runtime downstream consumers
// (e.g. github.com/wharflab/tally) still ship. That release only
// accepts grammar ABI 13-14; newer releases accept ABI 15+. Running
// the smoke test against this pinned version catches any ABI bump
// that would break pinned consumers.
require (
	github.com/tree-sitter/go-tree-sitter v0.24.0
	github.com/wharflab/tree-sitter-powershell v0.29.0
)

require github.com/mattn/go-pointer v0.0.1 // indirect

// Always build against the grammar in this checkout rather than whatever
// version the module proxy cached for the required pseudo-version above.
replace github.com/wharflab/tree-sitter-powershell => ../../

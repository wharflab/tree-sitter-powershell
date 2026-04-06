package tree_sitter_powershell_test

import (
	"testing"

	powershell "github.com/wharflab/tree-sitter-powershell"
)

func TestHighlightsQueryCompiles(t *testing.T) {
	if powershell.HighlightsQuery == "" {
		t.Fatal("HighlightsQuery is empty")
	}
	query, err := powershell.GetHighlightsQuery()
	if err != nil {
		t.Fatalf("highlights query failed to compile: %v", err)
	}
	defer query.Close()

	names := query.CaptureNames()
	if len(names) == 0 {
		t.Fatal("highlights query has no captures")
	}

	// Verify variable capture exists
	found := false
	for _, name := range names {
		if name == "variable" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected variable capture, got: %v", names)
	}
}

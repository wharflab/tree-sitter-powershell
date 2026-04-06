package main

import (
	"fmt"
	"os"

	sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_powershell "github.com/wharflab/tree-sitter-powershell/bindings/go"
)

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, format+"\n", args...)
	os.Exit(1)
}

func main() {
	lang := sitter.NewLanguage(tree_sitter_powershell.Language())
	if lang == nil || lang.Inner == nil {
		fail("Language() returned nil")
	}

	parser := sitter.NewParser()
	defer parser.Close()

	if err := parser.SetLanguage(lang); err != nil {
		fail("SetLanguage failed: %v", err)
	}

	// Keep the sample newline-terminated.
	source := []byte("Write-Host \"Hello World\"\n$x = 42\n")

	tree := parser.Parse(source, nil)
	if tree == nil {
		fail("Parse returned nil tree")
	}
	defer tree.Close()

	root := tree.RootNode()
	if root.Kind() != "program" {
		fail("root kind = %q, want %q", root.Kind(), "program")
	}
	if root.HasError() {
		fail("root node has parse errors")
	}

	// PowerShell grammar wraps statements in a statement_list node.
	if root.NamedChildCount() < 1 {
		fail("root named child count = %d, want >= 1", root.NamedChildCount())
	}
	stmtList := root.NamedChild(0)
	if stmtList.Kind() != "statement_list" {
		fail("first child kind = %q, want %q", stmtList.Kind(), "statement_list")
	}
	if stmtList.NamedChildCount() < 2 {
		fail("statement_list named child count = %d, want >= 2", stmtList.NamedChildCount())
	}

	fmt.Println("go consumer compatibility: ok")
}

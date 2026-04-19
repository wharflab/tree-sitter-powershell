package main

import (
	"fmt"
	"os"
	"strings"

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

	fmt.Printf("grammar ABI version: %d\n", lang.Version())

	parser := sitter.NewParser()
	defer parser.Close()

	if err := parser.SetLanguage(lang); err != nil {
		fail("SetLanguage failed: %v", err)
	}

	sanityCheck(parser)
	tallyRegressionCheck(parser)

	fmt.Println("go consumer compatibility: ok")
}

func sanityCheck(parser *sitter.Parser) {
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
		fail("root node has parse errors: %s", root.ToSexp())
	}

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
}

// tallyRegressionCheck asserts that the parse tree exposes the node kinds
// downstream highlighters (tally) rely on for a representative snippet.
// Each released grammar must keep producing them; breaking them regresses
// real consumers.
func tallyRegressionCheck(parser *sitter.Parser) {
	source := []byte("Invoke-WebRequest \"https://example.com/app.tar.gz\" -OutFile \"$HOME/app.tar.gz\" # note\n")

	tree := parser.Parse(source, nil)
	if tree == nil {
		fail("tally regression: Parse returned nil tree")
	}
	defer tree.Close()

	root := tree.RootNode()
	if root.HasError() {
		fail("tally regression: parse errors in %q\n%s", string(source), root.ToSexp())
	}

	sexp := root.ToSexp()
	requireKinds := []string{
		"command",
		"command_name",
		"command_parameter",
		"expandable_string_literal",
		"variable",
		"comment",
	}
	for _, kind := range requireKinds {
		if !strings.Contains(sexp, "("+kind) {
			fail("tally regression: missing node kind %q in parse tree\n%s", kind, sexp)
		}
	}
}

# tree-sitter-pwsh

PowerShell grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

Parses `.ps1` and `.psm1` files into a concrete syntax tree for syntax highlighting, code navigation, and analysis.

## Features

- **Pipelines and commands** &mdash; pipes `|`, chain operators `&&` `||`, PowerShell 7 line-initial pipe continuation (`\n| Cmd`), redirections `>` `>>` `2>&1`, invocation `&` `.`, splatting `@params`, barewords (including expandable `$var.suffix` forms), verbatim arguments `--%`
- **Directives** &mdash; `using namespace`, `using module` (type names, relative bareword paths like `.\Foo.psm1`, and hashtable specs), `using assembly`, `using static`, and top-of-file `#Requires`
- **Strings and interpolation** &mdash; expandable strings `"$var $(expr)"`, verbatim strings, here-strings `@"` / `@'`, sub-expressions `$(...)`, array sub-expressions `@(...)`, hashtable literals `@{}`, and PowerShell-style escaping
- **Functions and named blocks** &mdash; `function`, `filter`, `workflow` with `param()` blocks, attributes, validation, and `begin`/`process`/`end`/`clean`
- **Control flow** &mdash; `if`/`elseif`/`else`, `switch` (`-Regex`, `-Wildcard`, `-Exact`, `-CaseSensitive`), `foreach`, `for`, `while`, `do`/`while`/`until`
- **Error handling** &mdash; `try`/`catch`/`finally` with typed catch clauses, `trap`, `throw`, `break`, `continue`, `return`, `exit`
- **Workflow and data blocks** &mdash; `data` sections, `inlinescript`, `parallel`, and `sequence` statement blocks
- **Expressions** &mdash; ternary `? :`, null-coalescing `??`/`??=`, comparison/string/type/containment operators, `-f` format, range `..`
- **Types** &mdash; common .NET type forms including generics `[Dictionary[string, int]]`, arrays `[int[]]`, nested types `Array+Enumerator`, and backtick arity `` Dictionary`2 ``
- **Variables** &mdash; `$var`, `$scope:var`, `${braced}` with backtick escapes, `@splatted`, and special vars `$$` `$^` `$?` `$_`
- **Classes and enums** &mdash; attribute-decorated declarations (`[Flags()] enum`, `[Attr()] class`), properties, methods, constructors with `: base()`/`: this()` chaining, `hidden`/`static` modifiers, and inheritance clauses with generic bases (`: IComparer[Object]`)
- **Numbers** &mdash; decimal, hex `0x`, scientific `1.5e10`, numeric suffixes (`u`, `ul`, `s`, `us`, `y`, `uy`, `n`, `l`, `d`), and size multipliers (`kb`/`mb`/`gb`/`tb`/`pb`)
- **Case-insensitive keywords and operators** &mdash; parses PowerShell casing variations without normalization

## Example

```powershell
using namespace System.IO

function Get-FileSize {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    begin { $total = 0 }
    process {
        $size = (Get-Item $Path).Length
        $total += $size
    }
    end { $total }
    clean { Remove-Variable total }
}

$result = Get-FileSize -Path ".\README.md"
$message = $result -gt 1kb ? "Large file" : "Small file"
Write-Host $message
```

Parsed tree:

```
(program
  (using_directive_list
    (using_statement (type_name (type_name (type_identifier)) (type_identifier))))
  (statement_list
    (function_statement
      (function_name)
      (script_block
        (param_block
          (attribute_list
            (attribute (attribute_name (type_spec (type_name (type_identifier))))))
          (parameter_list
            (script_parameter
              (attribute_list
                (attribute (attribute_name (type_spec (type_name (type_identifier))))))
              (variable))))
        (script_block_body
          (named_block_list
            (named_block (block_name) (statement_block ...))
            (named_block (block_name) (statement_block ...))
            (named_block (block_name) (statement_block ...))
            (named_block (block_name) (statement_block ...))))))
    (pipeline
      (assignment_expression ...))
    (pipeline
      (assignment_expression ...))
    (pipeline
      (pipeline_chain
        (command (command_name) (command_elements ...))))))
```

## Installation

### npm

```sh
npm install tree-sitter-pwsh
```

### Cargo

```sh
cargo add tree-sitter-pwsh
```

### PyPI

```sh
pip install tree-sitter-pwsh
```

### Go

```go
import tree_sitter_powershell "github.com/wharflab/tree-sitter-powershell/bindings/go"
```

The root package also exports the bundled `queries/highlights.scm` via `go:embed`:

```go
import powershell "github.com/wharflab/tree-sitter-powershell"

lang := powershell.GetLanguage()
query, _ := powershell.GetHighlightsQuery()
```

## Usage

### Node.js

```javascript
import Parser from "tree-sitter";
import PowerShell from "tree-sitter-pwsh";

const parser = new Parser();
parser.setLanguage(PowerShell);

const tree = parser.parse(`Get-Process | Where-Object { $_.CPU -gt 10 }\n`);
console.log(tree.rootNode.toString());
```

### Rust

```rust
let mut parser = tree_sitter::Parser::new();
let language = tree_sitter_pwsh::LANGUAGE;
parser.set_language(&language.into()).unwrap();

let tree = parser.parse("Get-Process | Sort-Object CPU\n", None).unwrap();
println!("{}", tree.root_node().to_sexp());
```

### Python

```python
from tree_sitter import Language, Parser
import tree_sitter_pwsh

parser = Parser(Language(tree_sitter_pwsh.language()))
tree = parser.parse(b"Get-Process | Sort-Object CPU\n")
print(tree.root_node.sexp())
```

## Syntax Highlighting

The grammar ships with a `queries/highlights.scm` file for use in editors that support tree-sitter highlighting (Neovim, Helix, Zed, etc.).

## References

- [PowerShell Language Specification](https://learn.microsoft.com/en-us/powershell/scripting/lang-spec/chapter-01?view=powershell-7.5)
- [PowerShell/EditorSyntax](https://github.com/PowerShell/EditorSyntax) &mdash; used as a real-world parsing benchmark
- [PowerShell/tree-sitter-PowerShell](https://github.com/PowerShell/tree-sitter-PowerShell) &mdash; archived PowerShell grammar repo; provided a significant part of the corpus coverage and the `TheBigTestFile.ps1` benchmark target
- Originally forked from [airbus-cert/tree-sitter-powershell](https://github.com/airbus-cert/tree-sitter-powershell)

## License

[MIT](LICENSE)

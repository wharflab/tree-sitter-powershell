// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "TreeSitterPowershell",
    products: [
        .library(name: "TreeSitterPowershell", targets: ["TreeSitterPowershell"]),
    ],
    dependencies: [
        .package(name: "SwiftTreeSitter", url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.25.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterPowershell",
            dependencies: [],
            path: ".",
            exclude: [
                ".editorconfig",
                ".envrc",
                ".gitattributes",
                ".github",
                ".zed",
                "binding.gyp",
                "bindings/c",
                "bindings/go",
                "bindings/node",
                "bindings/python",
                "bindings/rust",
                "Cargo.lock",
                "Cargo.toml",
                "CMakeLists.txt",
                "eslint.config.mjs",
                "flake.lock",
                "flake.nix",
                "go-compat",
                "go.mod",
                "go.sum",
                "grammar.js",
                "LICENSE",
                "Makefile",
                "node_types.go",
                "package-lock.json",
                "package.json",
                "pyproject.toml",
                "queries.go",
                "queries_test.go",
                "README.md",
                "setup.py",
                "src/grammar.json",
                "src/node-types.json",
                "test",
                "tree-sitter.json",
            ],
            sources: [
                "src/parser.c",
                "src/scanner.c",
            ],
            resources: [
                .copy("queries"),
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")],
        ),
        .testTarget(
            name: "TreeSitterPowershellTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterPowershell",
            ],
            path: "bindings/swift/TreeSitterPowershellTests",
        ),
    ],
    cLanguageStandard: .c11
)

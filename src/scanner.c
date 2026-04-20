// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See the LICENSE file in the project root for full license information.

#include "tree_sitter/parser.h"
#include <stdint.h>

enum TOKEN_TYPE {
    STATEMENT_BOUNDARY,
    FOR_CLAUSE_BREAK,
};

/* --- API --- */

void *tree_sitter_powershell_external_scanner_create();

void tree_sitter_powershell_external_scanner_destroy(void *p);

unsigned tree_sitter_powershell_external_scanner_serialize(void *payload, char *buffer);

void tree_sitter_powershell_external_scanner_deserialize(void *payload, const char *buffer, unsigned length);

bool tree_sitter_powershell_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols);

/* --- Internal Functions --- */

static void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static bool is_inline_trivia(int32_t lookahead)
{
    if (lookahead >= 0x2000 && lookahead <= 0x200B) return true;

    switch (lookahead) {
        case ' ':
        case '\t':
        case '\f':
        case '\v':
        case 0x1680:
        case 0x00A0:
        case 0x202F:
        case 0x205F:
        case 0x200B:
        case 0x2060:
        case 0x3000:
        case 0xFEFF:
            return true;
        default:
            return false;
    }
}

static bool scan_statement_boundary(TSLexer *lexer, const bool *valid_symbols)
{
    if (!valid_symbols[STATEMENT_BOUNDARY]) return false;

    lexer->result_symbol = STATEMENT_BOUNDARY;
    // This token has no characters -- everything is lookahead to determine its existence.
    lexer->mark_end(lexer);

    bool saw_newline = false;
    for (;;) {
        if (lexer->lookahead == 0) return true;
        if (lexer->lookahead == '}') return true;
        if (lexer->lookahead == ')') return true;
        if (lexer->lookahead == ';') return true;
        if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
            saw_newline = true;
            skip(lexer);
            continue;
        }
        if (is_inline_trivia(lexer->lookahead)) {
            skip(lexer);
            continue;
        }
        // Comments (line `#...` and block `<# ... #>`) are extras to PowerShell
        // and must not terminate a pipeline that continues on a subsequent line
        // with a leading `|`, `||`, or `&&`.
        if (lexer->lookahead == '#') {
            skip(lexer);
            while (lexer->lookahead != 0 && lexer->lookahead != '\n' && lexer->lookahead != '\r') {
                skip(lexer);
            }
            continue;
        }
        if (lexer->lookahead == '<') {
            // Only `<#` starts a block comment; a bare `<` isn't our concern
            // and the main lexer will handle it (though it's not grammatical
            // at statement boundaries today).
            skip(lexer);
            if (lexer->lookahead != '#') return saw_newline;
            skip(lexer);
            for (;;) {
                if (lexer->lookahead == 0) return true;
                if (lexer->lookahead == '#') {
                    skip(lexer);
                    if (lexer->lookahead == '>') {
                        skip(lexer);
                        break;
                    }
                    continue;
                }
                skip(lexer);
            }
            continue;
        }
        if (saw_newline) {
            // PowerShell 7 pipeline continuation: a line-initial `|`, `||`, or `&&`
            // continues the current pipeline, so suppress the boundary.
            if (lexer->lookahead == '|') return false;
            if (lexer->lookahead == '&') {
                skip(lexer);
                return lexer->lookahead != '&';
            }
            return true;
        }
        return false;
    }
}

static bool scan_for_clause_break(TSLexer *lexer, const bool *valid_symbols)
{
    if (!valid_symbols[FOR_CLAUSE_BREAK]) return false;

    if (lexer->lookahead == '\r') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '\n') lexer->advance(lexer, false);
    } else if (lexer->lookahead == '\n') {
        lexer->advance(lexer, false);
    } else {
        return false;
    }

    while (is_inline_trivia(lexer->lookahead)) {
        skip(lexer);
    }

    lexer->result_symbol = FOR_CLAUSE_BREAK;
    // A newline-style `for (...)` separator is only valid between present clauses.
    lexer->mark_end(lexer);
    return true;
}

/* --- API Implementation --- */

bool tree_sitter_powershell_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
    (void)payload;

    if (scan_for_clause_break(lexer, valid_symbols)) return true;
    return scan_statement_boundary(lexer, valid_symbols);
}

void *tree_sitter_powershell_external_scanner_create()
{
    return NULL;
}

void tree_sitter_powershell_external_scanner_destroy(void *p)
{
    (void)p;
}

unsigned tree_sitter_powershell_external_scanner_serialize(void *payload, char *buffer)
{
    (void)payload;
    (void)buffer;
    return 0;
}

void tree_sitter_powershell_external_scanner_deserialize(void *payload, const char *buffer, unsigned length)
{
    (void)payload;
    (void)buffer;
    (void)length;
}

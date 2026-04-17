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
    switch (lookahead) {
        case ' ':
        case '\t':
        case '\f':
        case '\v':
        case 0x00A0:
        case 0x200B:
        case 0x2060:
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

    for (;;) {
        if (lexer->lookahead == 0) return true;
        if (lexer->lookahead == '}') return true;
        if (lexer->lookahead == ')') return true;
        if (lexer->lookahead == ';') return true;
        if (lexer->lookahead == '\n' || lexer->lookahead == '\r') return true;
        if (!is_inline_trivia(lexer->lookahead)) return false;
        skip(lexer);
    }
}

static bool scan_for_clause_break(TSLexer *lexer, const bool *valid_symbols)
{
    if (!valid_symbols[FOR_CLAUSE_BREAK]) return false;

    while (is_inline_trivia(lexer->lookahead)) {
        skip(lexer);
    }

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

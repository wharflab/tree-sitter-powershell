/// <reference types="tree-sitter-cli/dsl"/>
// @ts-check

const PREC = {
  KEYWORD: 1,
  UNARY: 2,
  CAST: 3,
  ELEMENT_ACCESS: 4,
  EMPTY: 5,
  PARAM: 6,
};

const PS_IDENTIFIER_START_CHARS = '\\p{Lu}\\p{Ll}\\p{Lt}\\p{Lm}\\p{Lo}_';
const PS_DECIMAL_DIGIT_CHARS = '\\p{Nd}';
const PS_IDENTIFIER_FOLLOW_CHARS = `${PS_IDENTIFIER_START_CHARS}${PS_DECIMAL_DIGIT_CHARS}`;
const PS_VARIABLE_CHARS = PS_IDENTIFIER_FOLLOW_CHARS;
const PS_COMMAND_NAME_CHARS = `${PS_VARIABLE_CHARS}?`;
const PS_PARAMETER_FIRST_CHARS = `${PS_IDENTIFIER_START_CHARS}?\\-`;
const PS_PARAMETER_FOLLOW_CHARS = '^\\{\\}\\(\\);,\\|&\\.\\[:\\s';
const PS_DOLLAR_LITERAL_START_CHARS = `({${PS_COMMAND_NAME_CHARS}\\$\\^"\``;

/** @param {string} pattern */
const psRegex = (pattern) => new RegExp(pattern, 'u');

const psIdentifier = () =>
  psRegex(`[${PS_IDENTIFIER_START_CHARS}][${PS_IDENTIFIER_FOLLOW_CHARS}]*`);

const psTypeIdentifier = () =>
  psRegex(`[${PS_IDENTIFIER_START_CHARS}][${PS_IDENTIFIER_FOLLOW_CHARS}]*(\`{1,2}[0-9]+)?`);

const psVariablePart = () => psRegex(`[${PS_VARIABLE_CHARS}]+`);

const psVariableScope = () =>
  choice(
    new RegExp(caseInsensitive('global')),
    new RegExp(caseInsensitive('local')),
    new RegExp(caseInsensitive('private')),
    new RegExp(caseInsensitive('script')),
    new RegExp(caseInsensitive('using')),
    new RegExp(caseInsensitive('workflow')),
    psVariablePart(),
  );

const psDecimalDigits = () => psRegex(`[${PS_DECIMAL_DIGIT_CHARS}]+`);

/** @param {string} [lineTerminator] */
const psDollarLiteral = (lineTerminator = '') =>
  psRegex(`\\$(\`.{1}|\`\\r?\\n|[^${PS_DOLLAR_LITERAL_START_CHARS}${lineTerminator}][^\\$"${lineTerminator}\`]*)`);

const switchPattern = ($) =>
  choice($._primary_expression, $._switch_condition_token);

export default grammar({
  name: 'powershell',

  externals: ($) => [
    $._statement_boundary,
    $._attribute_statement_boundary,
    $._for_clause_break,
    $._expandable_string_immcontent,
  ],

  extras: ($) => [
    $.comment,
    /\s/,
    /`\n/,
    /`\r\n/,
    /[\uFEFF\u2060\u200B\u00A0]/,
  ],

  conflicts: ($) => [
    [$._literal, $.member_name],
    [$.class_property_definition, $.attribute],
    [$.class_method_definition, $.attribute],
    [$.path_command_name, $._value],
  ],

  rules: {
    program: ($) =>
      seq(
        optional(
          choice(
            seq($.requires_directive_list, optional($.using_directive_list)),
            seq($.using_directive_list, optional($.requires_directive_list)),
          ),
        ),
        optional($.param_block),
        optional($.statement_list),
      ),

    using_directive_list: ($) =>
      repeat1(seq($.using_statement, $._statement_boundary)),

    requires_directive_list: ($) =>
      prec.right(repeat1(seq($.requires_statement, $._statement_boundary))),

    // Comments
    comment: ($) =>
      token(
        choice(
          /#[^\r\n]*/,
          seq('<#', repeat(choice(/[^#`]+/, /#+[^>#]/, /`.{1}|`\r?\n/)), /#+>/),
        ),
      ),

    // Literal
    _literal: ($) =>
      choice($.integer_literal, $.string_literal, $.real_literal),

    // Integer Literals
    integer_literal: ($) =>
      choice($.decimal_integer_literal, $.hexadecimal_integer_literal),

    decimal_integer_literal: ($) =>
      token(
        seq(
          psDecimalDigits(),
          optional(/[yY]|[uU][yYsSlL]|[uUsSdDnNlL]/),
          optional(/[kKmMgGtTpP][bB]/),
        ),
      ),

    hexadecimal_integer_literal: ($) =>
      token(
        seq(
          /0[xX]/,
          /[0-9a-fA-F]+/,
          optional(/[yY]|[uU][yYsSlL]|[uUsSnNlL]/),
          optional(/[kKmMgGtTpP][bB]/),
        ),
      ),

    // Real Literals
    real_literal: ($) =>
      token(
        choice(
          seq(
            seq(psDecimalDigits(), '.', psDecimalDigits()),
            optional(token(seq(/[eE]/, optional(choice('+', '-')), psDecimalDigits()))),
            optional(/[dDlL]/),
            optional(/[kKmMgGtTpP][bB]/),
          ),
          seq(
            seq('.', psDecimalDigits()),
            optional(token(seq(/[eE]/, optional(choice('+', '-')), psDecimalDigits()))),
            optional(/[dDlL]/),
            optional(/[kKmMgGtTpP][bB]/),
          ),
          seq(
            psDecimalDigits(),
            token(seq(/[eE]/, optional(choice('+', '-')), psDecimalDigits())),
            optional(/[dDlL]/),
            optional(/[kKmMgGtTpP][bB]/),
          ),
        ),
      ),

    // String literal
    string_literal: ($) =>
      choice(
        $.expandable_string_literal,
        $.verbatim_string_characters,
        $.expandable_here_string_literal,
        $.verbatim_here_string_characters,
      ),

    _expandable_string_content: ($) =>
      choice(
        $._expandable_string_immcontent,
        $.variable,
        $.sub_expression,
        token.immediate(psDollarLiteral()),
        token.immediate(/`.{1}|`\r?\n/),
        token.immediate('""'),
        token.immediate('$'),
      ),

    _expandable_string_leading_text: () => token(seq('"', /[^\$\"`]+|""/)),

    _expandable_string_leading_literal_dollar: () =>
      token(seq('"', psDollarLiteral())),

    expandable_string_literal: ($) =>
      prec(
        1,
        choice(
          seq(
            choice(
              $._expandable_string_leading_text,
              $._expandable_string_leading_literal_dollar,
              seq('"', $.variable),
              seq('"', $.sub_expression),
              seq('"', token.immediate(/`.{1}|`\r?\n/)),
              seq('"', token.immediate('""')),
              seq('"', token.immediate('$')),
            ),
            repeat($._expandable_string_content),
            token.immediate('"'),
          ),
          '""',
        ),
      ),

    expandable_here_string_literal: ($) =>
      seq(
        /@\" *\r?\n/,
        repeat(
          choice(
            token.immediate(/[^\$\r\n`]+/),
            $.variable,
            $.sub_expression,
            token.immediate(/(\r?\n)+[^\"\r\n]/),
            token.immediate(/(\r?\n)+\"[^@]/),
            token.immediate(psDollarLiteral('\\r\\n')),
            token.immediate('$'),
            token.immediate(/`.{1}|`\r?\n/),
          ),
        ),
        token.immediate(/(\r?\n)+\"@/),
      ),

    verbatim_string_characters: ($) =>
      token(seq('\'', repeat(choice(/[^']+/, '\'\'')), '\'')),

    verbatim_here_string_characters: ($) =>
      token(
        seq(
          /@\'\s*\r?\n/,
          repeat(choice(/[^\r\n]/, /(\r?\n)+[^\'\r\n]/, /\r?\n\'[^@]/)),
          /(\r?\n)+\'@/,
        ),
      ),

    // Simple names
    simple_name: ($) => psIdentifier(),

    // Type names
    type_identifier: ($) => psTypeIdentifier(),

    type_name: ($) =>
      choice(
        $.type_identifier,
        seq($.type_name, '.', $.type_identifier),
        seq($.type_name, '+', $.type_identifier),
      ),

    array_type_name: ($) => seq($.type_name, '['),
    generic_type_name: ($) => seq($.type_name, '['),

    // Operators and punctuators
    assignement_operator: ($) =>
      choice('=', '!=', '+=', '*=', '/=', '%=', '-=', '??='),

    file_redirection_operator: ($) =>
      choice(
        '>',
        '>>',
        '2>',
        '2>>',
        '3>',
        '3>>',
        '4>',
        '4>>',
        '5>',
        '5>>',
        '6>',
        '6>>',
        '*>',
        '*>>',
        '<',
      ),

    merging_redirection_operator: ($) =>
      choice(
        '*>&1',
        '2>&1',
        '3>&1',
        '4>&1',
        '5>&1',
        '6>&1',
        '*>&2',
        '1>&2',
        '3>&2',
        '4>&2',
        '5>&2',
        '6>&2',
      ),

    comparison_operator: ($) =>
      choice(
        reservedWord('-as'),
        reservedWord('-ccontains'),
        reservedWord('-ceq'),
        reservedWord('-cge'),
        reservedWord('-cgt'),
        reservedWord('-cle'),
        reservedWord('-clike'),
        reservedWord('-clt'),
        reservedWord('-cmatch'),
        reservedWord('-cne'),
        reservedWord('-cnotcontains'),
        reservedWord('-cnotlike'),
        reservedWord('-cnotmatch'),
        reservedWord('-contains'),
        reservedWord('-creplace'),
        reservedWord('-csplit'),
        reservedWord('-eq'),
        reservedWord('-ge'),
        reservedWord('-gt'),
        reservedWord('-icontains'),
        reservedWord('-ieq'),
        reservedWord('-ige'),
        reservedWord('-igt'),
        reservedWord('-ile'),
        reservedWord('-ilike'),
        reservedWord('-ilt'),
        reservedWord('-imatch'),
        reservedWord('-in'),
        reservedWord('-ine'),
        reservedWord('-inotcontains'),
        reservedWord('-inotlike'),
        reservedWord('-inotmatch'),
        reservedWord('-ireplace'),
        reservedWord('-is'),
        reservedWord('-isnot'),
        reservedWord('-isplit'),
        reservedWord('-join'),
        reservedWord('-le'),
        reservedWord('-like'),
        reservedWord('-lt'),
        reservedWord('-match'),
        reservedWord('-ne'),
        reservedWord('-notcontains'),
        reservedWord('-notin'),
        reservedWord('-notlike'),
        reservedWord('-notmatch'),
        reservedWord('-replace'),
        reservedWord('-shl'),
        reservedWord('-shr'),
        reservedWord('-split'),
      ),

    format_operator: ($) => reservedWord('-f'),

    // Variables
    variable: ($) =>
      choice(
        '$$',
        '$^',
        '$?',
        '$_',
        token(
          seq(
            '$',
            optional(
              seq(
                choice(
                  reservedWord('global:'),
                  reservedWord('local:'),
                  reservedWord('private:'),
                  reservedWord('script:'),
                  reservedWord('using:'),
                  reservedWord('workflow:'),
                  psVariablePart(),
                ),
                ':',
              ),
            ),
            choice(psVariablePart(), '?'),
          ),
        ),
        token(
          seq(
            '@',
            optional(
              seq(
                choice(
                  reservedWord('global:'),
                  reservedWord('local:'),
                  reservedWord('private:'),
                  reservedWord('script:'),
                  reservedWord('using:'),
                  reservedWord('workflow:'),
                  psVariablePart(),
                ),
                ':',
              ),
            ),
            choice(psVariablePart(), '?'),
          ),
        ),
        $.braced_variable,
      ),

    braced_variable: ($) =>
      token(
        seq(
          '${',
          // A braced variable body accepts any character except `}` or a
          // trailing backtick; `` ` `` escapes the next character (including
          // `}`) so identifiers like `${vjOj`Q`gX}` or `${foo`}bar}` parse.
          // Written as an alternation because tree-sitter's regex engine
          // rejects `\s`/`\S` shorthands inside character classes.
          repeat1(choice(seq('`', choice(/./, /\s/)), /[^}`]/, /\s/)),
          '}',
        ),
      ),

    // Commands
    generic_token: ($) =>
      token(/[^\(\)\$\"\'\-\{\}@\|\[`\&\s][^\&\s\(\)\}\|;,]*/),

    // A backtick escape sequence used in bareword command-argument position,
    // e.g. `n (newline), `r (carriage-return). The tail absorbs any immediately-
    // adjacent bareword characters so that adjacent-token forms like `n'hello'`n
    // parse as one unit when there is no whitespace between them.
    escape_character: ($) =>
      token(seq(/`[^\r\n]/, /[^\&\s\(\)\}\|;,]*/)),

    _command_token: ($) => token(/[^\(\)\{\}\s;\&]+/),

    // Parameters
    command_parameter: ($) =>
      token(choice(seq(/-+/, psRegex(`[${PS_PARAMETER_FIRST_CHARS}][${PS_PARAMETER_FOLLOW_CHARS}]*`)), '--')),

    _verbatim_command_argument_chars: ($) =>
      repeat1(choice(/"[^"]*"/, /&[^&]*/, /[^\|\r\n]+/)),

    // Grammar

    // Statements
    script_block: ($) =>
      choice(
        field('script_block_body', $.script_block_body),
        seq(
          seq($.param_block, $._statement_boundary, repeat(';')),
          field('script_block_body', optional($.script_block_body)),
        ),
      ),

    param_block: ($) =>
      seq(
        optional($.attribute_list),
        reservedWord('param'),
        '(',
        optional($.parameter_list),
        ')',
      ),

    parameter_list: ($) =>
      seq($.script_parameter, repeat(seq(',', $.script_parameter))),

    script_parameter: ($) =>
      seq(
        optional($.attribute_list),
        $.variable,
        optional($.script_parameter_default),
      ),

    script_parameter_default: ($) => seq('=', $._expression),

    script_block_body: ($) =>
      choice(
        field('named_block_list', $.named_block_list),
        field('statement_list', $.statement_list),
      ),

    named_block_list: ($) => repeat1($.named_block),

    named_block: ($) => seq($.block_name, $.statement_block),

    block_name: ($) =>
      choice(
        reservedWord('dynamicparam'),
        reservedWord('begin'),
        reservedWord('process'),
        reservedWord('end'),
        reservedWord('clean'),
      ),

    statement_block: ($) =>
      seq('{', field('statement_list', optional($.statement_list)), '}'),

    statement_list: ($) => repeat1($._statement),

    _statement: ($) =>
      prec.right(
        choice(
          $.if_statement,
          seq(optional($.label), $._labeled_statement),
          $.function_statement,
          $.class_statement,
          $.enum_statement,
          $.attribute_statement,
          seq($.flow_control_statement, $._statement_boundary),
          $.trap_statement,
          $.try_statement,
          $.data_statement,
          $.inlinescript_statement,
          $.parallel_statement,
          $.sequence_statement,
          seq($.pipeline, $._statement_boundary),
          $.empty_statement,
        ),
      ),

    empty_statement: ($) => prec(PREC.EMPTY, ';'),

    attribute_statement: ($) =>
      seq(alias($._attribute_expression, $.attribute), $._attribute_statement_boundary),

    if_statement: ($) =>
      prec.left(
        seq(
          reservedWord('if'),
          '(',
          field('condition', $.pipeline),
          ')',
          $.statement_block,
          field('elseif_clauses', optional($.elseif_clauses)),
          field('else_clause', optional($.else_clause)),
        ),
      ),

    elseif_clauses: ($) => prec.left(repeat1($.elseif_clause)),

    elseif_clause: ($) =>
      seq(
        reservedWord('elseif'),
        '(',
        field('condition', $.pipeline),
        ')',
        $.statement_block,
      ),

    else_clause: ($) => seq(reservedWord('else'), $.statement_block),

    _labeled_statement: ($) =>
      choice(
        $.switch_statement,
        $.foreach_statement,
        $.for_statement,
        $.while_statement,
        $.do_statement,
      ),

    switch_statement: ($) =>
      seq(
        reservedWord('switch'),
        optional($.switch_parameters),
        $.switch_condition,
        $.switch_body,
      ),

    switch_parameters: ($) => repeat1($.switch_parameter),

    switch_parameter: ($) =>
      choice(
        reservedWord('-regex'),
        reservedWord('-wildcard'),
        reservedWord('-exact'),
        reservedWord('-casesensitive'),
        reservedWord('-parallel'),
      ),

    switch_condition: ($) =>
      choice(
        seq('(', $.pipeline, ')'),
        seq(reservedWord('-file'), $.switch_filename),
      ),

    switch_filename: ($) => switchPattern($),

    switch_body: ($) => seq('{', optional($.switch_clauses), '}'),

    switch_clauses: ($) => repeat1($.switch_clause),

    switch_clause: ($) =>
      seq(
        $.switch_clause_condition,
        $.statement_block,
        $._statement_boundary,
        repeat(';'),
      ),

    switch_clause_condition: ($) => switchPattern($),

    _switch_condition_token: ($) =>
      token(/[^\(\)\{\}\s;\&"'][^\(\)\{\}\s;\&]*/),

    foreach_statement: ($) =>
      seq(
        reservedWord('foreach'),
        optional($.foreach_parameter),
        '(',
        $.variable,
        reservedWord('in'),
        $.pipeline,
        ')',
        $.statement_block,
      ),

    foreach_parameter: ($) => choice(reservedWord('-parallel')),

    for_statement: ($) =>
      seq(
        reservedWord('for'),
        '(',
        choice(
          seq(
            field('for_initializer', $.for_initializer),
            forClauseSeparator($),
            field('for_condition', $.for_condition),
            forClauseSeparator($),
            field('for_iterator', $.for_iterator),
          ),
          seq(
            field('for_initializer', $.for_initializer),
            forClauseSeparator($),
            field('for_condition', $.for_condition),
            ';',
          ),
          seq(
            field('for_initializer', $.for_initializer),
            forClauseSeparator($),
            ';',
            field('for_iterator', $.for_iterator),
          ),
          seq(
            field('for_initializer', $.for_initializer),
            ';',
            ';',
          ),
          seq(
            ';',
            field('for_condition', $.for_condition),
            forClauseSeparator($),
            field('for_iterator', $.for_iterator),
          ),
          seq(
            ';',
            field('for_condition', $.for_condition),
            ';',
          ),
          seq(
            ';',
            ';',
            field('for_iterator', $.for_iterator),
          ),
          seq(';', ';'),
        ),
        ')',
        $.statement_block,
      ),

    for_initializer: ($) => $.pipeline,

    for_condition: ($) => $.pipeline,

    for_iterator: ($) => $.pipeline,

    while_statement: ($) =>
      seq(
        reservedWord('while'),
        '(',
        field('condition', $.while_condition),
        ')',
        $.statement_block,
      ),

    while_condition: ($) => $.pipeline,

    do_statement: ($) =>
      seq(
        reservedWord('do'),
        $.statement_block,
        choice(reservedWord('while'), reservedWord('until')),
        '(',
        field('condition', $.while_condition),
        ')',
      ),

    function_statement: ($) =>
      seq(
        choice(
          reservedWord('function'),
          reservedWord('filter'),
          reservedWord('workflow'),
        ),
        $.function_name,
        optional($.function_parameter_declaration),
        '{',
        optional($.script_block),
        '}',
      ),

    function_name: ($) => $._command_token,

    function_parameter_declaration: ($) =>
      seq('(', optional($.parameter_list), ')'),

    flow_control_statement: ($) =>
      choice(
        seq(reservedWord('break'), optional($.label_expression)),
        seq(reservedWord('continue'), optional($.label_expression)),
        seq(reservedWord('throw'), optional($.pipeline)),
        seq(reservedWord('return'), optional($.pipeline)),
        seq(reservedWord('exit'), optional($.pipeline)),
      ),

    label: ($) => token(seq(':', psIdentifier())),

    label_expression: ($) => choice($.label, $.unary_expression),

    trap_statement: ($) =>
      seq(reservedWord('trap'), optional($.type_literal), $.statement_block),

    try_statement: ($) =>
      seq(
        reservedWord('try'),
        $.statement_block,
        choice(
          seq($.catch_clauses, optional($.finally_clause)),
          optional($.finally_clause),
        ),
      ),

    catch_clauses: ($) => repeat1($.catch_clause),

    catch_clause: ($) =>
      seq(
        reservedWord('catch'),
        optional($.catch_type_list),
        $.statement_block,
      ),

    catch_type_list: ($) =>
      seq($.type_literal, repeat(seq(',', $.type_literal))),

    finally_clause: ($) => seq(reservedWord('finally'), $.statement_block),

    data_statement: ($) =>
      seq(
        reservedWord('data'),
        optional($.data_name),
        optional($.data_commands_allowed),
        $.statement_block,
      ),

    data_name: ($) => $.simple_name,

    data_commands_allowed: ($) =>
      seq(reservedWord('-supportedcommand'), $.data_commands_list),

    data_commands_list: ($) =>
      seq($.data_command, repeat(seq(',', $.data_command))),

    data_command: ($) => $.command_name_expr,

    inlinescript_statement: ($) =>
      seq(reservedWord('inlinescript'), $.statement_block),

    parallel_statement: ($) => seq(reservedWord('parallel'), $.statement_block),

    sequence_statement: ($) => seq(reservedWord('sequence'), $.statement_block),

    requires_statement: ($) =>
      seq($.requires_keyword, repeat1($.requires_argument_group)),

    requires_keyword: () =>
      token(prec(PREC.KEYWORD, new RegExp(`#${caseInsensitive('requires')}`))),

    requires_argument_group: ($) =>
      seq($.requires_argument, repeat(seq(',', $.requires_argument))),

    requires_argument: ($) =>
      choice(
        $.command_parameter,
        $.hash_literal_expression,
        $.string_literal,
        $.real_literal,
        $.integer_literal,
        $.generic_token,
      ),

    using_statement: ($) =>
      seq(
        reservedWord('using'),
        choice(
          seq(
            reservedWord('namespace'),
            $.type_name,
          ),
          seq(
            reservedWord('module'),
            choice($.type_name, $.verbatim_string_characters, $.hash_literal_expression, $.command_name),
          ),
          seq(
            reservedWord('assembly'),
            choice($.type_name, $.verbatim_string_characters),
          ),
          seq(
            reservedWord('static'),
            $.type_name,
          ),
        ),
      ),

    pipeline: ($) =>
      choice(
        $.assignment_expression,
        seq(
          $.pipeline_chain,
          repeat(seq($.pipeline_chain_tail, $.pipeline_chain)),
        ),
      ),

    pipeline_chain: ($) =>
      choice(
        seq(
          $._expression,
          optional($.redirections),
          optional($._pipeline_tail),
        ),
        seq(
          $.command,
          optional($.verbatim_command_argument),
          optional($._pipeline_tail),
        ),
      ),

    pipeline_chain_tail: ($) => choice('&&', '||'),

    // Distinct a normal expression to a left assignement expession
    left_assignment_expression: ($) => $._expression,

    assignment_expression: ($) =>
      seq(
        $.left_assignment_expression,
        $.assignement_operator,
        field('value', $._statement),
      ),

    _pipeline_tail: ($) => repeat1(seq('|', $.command)),

    command: ($) =>
      choice(
        seq(
          field('command_name', $.command_name),
          field('command_elements', optional($.command_elements)),
        ),
        seq(
          $.command_invokation_operator,
          // optional($.command_module),
          field('command_name', $.command_name_expr),
          field('command_elements', optional($.command_elements)),
        ),
      ),

    command_invokation_operator: ($) => choice('.', '&'),

    // This rule is ignored as it does not appear as a rule
    // command_module: $ => $.primary_expression,

    _expandable_string_literal_immediate: ($) =>
      seq(
        repeat(
          choice(
            /[^\$"`]+/,
            $.variable,
            psDollarLiteral(),
            /`.{1}|`\r?\n/,
            '""',
            $.sub_expression,
            '$',
          ),
        ),
        '"',
      ),

    command_name: ($) =>
      seq(
        choice(
          /[^\{\}\(\);,\|\&`"'\s\r\n\[\]\+\-\$@<\!]+/,
          // tree-sitter does not allow to control lexer
          // each start keyword into _statement rule must be present here
          // https://github.com/airbus-cert/tree-sitter-powershell/issues/24
          new RegExp(caseInsensitive('break-')),
          new RegExp(caseInsensitive('continue-')),
          new RegExp(caseInsensitive('throw-')),
          new RegExp(caseInsensitive('return-')),
          new RegExp(caseInsensitive('exit-')),
          new RegExp(caseInsensitive('try-')),
          new RegExp(caseInsensitive('trap-')),
          new RegExp(caseInsensitive('if-')),
          new RegExp(caseInsensitive('function-')),
          new RegExp(caseInsensitive('filter-')),
          new RegExp(caseInsensitive('workflow-')),
          new RegExp(caseInsensitive('class-')),
          new RegExp(caseInsensitive('enum-')),
          new RegExp(caseInsensitive('switch-')),
          new RegExp(caseInsensitive('foreach-')),
          new RegExp(caseInsensitive('for-')),
          new RegExp(caseInsensitive('while-')),
          new RegExp(caseInsensitive('do-')),
          new RegExp(caseInsensitive('data-')),
          new RegExp(caseInsensitive('parallel-')),
          new RegExp(caseInsensitive('inlinescript-')),
          new RegExp(caseInsensitive('sequence-')),
          new RegExp(caseInsensitive('using-')),
        ),
        repeat(
          choice(
            token.immediate(/[^\{\}\(\);,\|\&"'\s\r\n]+/),
            seq(token.immediate('"'), $._expandable_string_literal_immediate),
            token.immediate('""'),
            token.immediate('\'\''),
          ),
        ),
      ),

    path_command_name_token: ($) => psRegex(`[${PS_COMMAND_NAME_CHARS}\\-\\.\\\\\\/]+`),

    // Use to parse command path
    path_command_name: ($) =>
      repeat1(choice($.path_command_name_token, $.variable)),

    command_name_expr: ($) =>
      choice($.command_name, $.path_command_name, $._primary_expression),

    command_elements: ($) => prec.right(repeat1($._command_element)),

    _command_element: ($) =>
      prec.right(
        choice(
          $.command_parameter,
          seq($._command_argument, optional($.argument_list)),
          $.redirection,
          $.stop_parsing,
        ),
      ),

    // Stop parsing is a token that end the parsing of command line
    stop_parsing: ($) => /--%[^\r\n]*/,

    // Generic token is hard to manage
    // So a definition is that a generic token must have to begin by one or more space char
    command_argument_sep: ($) => prec.right(choice(repeat1(' '), ':')),

    // Adapt the grammar to have same behavior

    _command_argument: ($) =>
      prec.right(
        PREC.PARAM,
        choice(
          seq($.command_argument_sep, $.concatenated_command_argument),
          seq($.command_argument_sep, optional($.generic_token)),
          seq($.command_argument_sep, $.array_literal_expression),
          seq($.command_argument_sep, $.expandable_bareword),
          seq($.command_argument_sep, $.bareword_argument_list),
          seq($.command_argument_sep, $.escape_character),
          $.parenthesized_expression,
          $.script_block_expression,
        ),
      ),

    // PowerShell command mode concatenates adjacent quoted strings, variables,
    // and bareword fragments into one argument when there is no whitespace.
    concatenated_command_argument: ($) =>
      prec.right(
        PREC.PARAM,
        choice(
          seq($.string_literal, repeat1($._immediate_command_argument_fragment)),
          seq(
            $._concatenated_command_argument_head,
            $._immediate_string_command_argument_fragment,
            repeat($._immediate_command_argument_fragment),
          ),
        ),
      ),

    _concatenated_command_argument_head: ($) =>
      choice(
        $.array_literal_expression,
        $.expandable_bareword,
        $.generic_token,
        $.escape_character,
      ),

    _immediate_command_argument_fragment: ($) =>
      choice(
        $._immediate_non_string_command_argument_fragment,
        $._immediate_string_command_argument_fragment,
      ),

    _immediate_non_string_command_argument_fragment: ($) =>
      choice(
        alias($._immediate_variable, $.variable),
        alias($._immediate_bareword_argument_fragment, $.generic_token),
        alias($._immediate_escape_character, $.escape_character),
      ),

    _immediate_string_command_argument_fragment: ($) =>
      choice(
        alias($._immediate_expandable_string_literal, $.expandable_string_literal),
        alias($._immediate_verbatim_string_characters, $.verbatim_string_characters),
      ),

    _immediate_variable: ($) =>
      choice(
        token.immediate('$$'),
        token.immediate('$^'),
        token.immediate('$?'),
        token.immediate('$_'),
        token.immediate(
          seq(
            '$',
            optional(seq(psVariableScope(), ':')),
            choice(psVariablePart(), '?'),
          ),
        ),
        token.immediate(
          seq(
            '@',
            optional(seq(psVariableScope(), ':')),
            choice(psVariablePart(), '?'),
          ),
        ),
        $._immediate_braced_variable,
      ),

    _immediate_braced_variable: ($) =>
      token.immediate(
        seq(
          '${',
          repeat1(choice(seq('`', choice(/./, /\s/)), /[^}`]/, /\s/)),
          '}',
        ),
      ),

    _immediate_expandable_string_literal: () =>
      token.immediate(seq('"', repeat(choice(/[^"`]+/, /`.{1}|`\r?\n/, '""')), '"')),

    _immediate_verbatim_string_characters: () =>
      token.immediate(seq(/'/, repeat(choice(/[^']+/, /''/)), /'/)),

    _immediate_bareword_argument_fragment: () =>
      token.immediate(/[^\&\s\(\)\}\|;,\$"'`]+/),

    _immediate_escape_character: () =>
      token.immediate(seq(/`[^\r\n]/, /[^\&\s\(\)\}\|;,\$"'`]*/)),

    // A bareword argument whose prefix is a variable immediately followed
    // (no whitespace) by generic-token characters. Matches patterns like
    // `$Path\Command` or `$Root/sub/path.txt` in command argument position.
    expandable_bareword: ($) =>
      seq($.variable, alias($._expandable_bareword_tail, $.generic_token)),

    // The leading character must not start a distinct expression form such
    // as member access (`.`), element access (`[`), a script block (`{`),
    // another variable (`$`), a string literal (`"` / `'`), or a backtick
    // escape. Once the tail has started, only whitespace, pipes, and other
    // command terminators end it.
    _expandable_bareword_tail: ($) =>
      token.immediate(/[^\&\s\(\)\}\|;,\$\[\{\.\"\'`][^\&\s\(\)\}\|;,]*/),

    // A comma-separated list of command arguments that starts with a
    // bareword or expandable bareword. Used for commands like
    // `Select-Object PSPath, PSChildName` and `Get-Item $x\a-*, $y\b-*`.
    bareword_argument_list: ($) =>
      prec.right(
        seq(
          choice($.generic_token, $.expandable_bareword),
          repeat1(
            seq(
              ',',
              choice($.generic_token, $.expandable_bareword, $.unary_expression),
            ),
          ),
        ),
      ),

    verbatim_command_argument: ($) =>
      seq('--%', $._verbatim_command_argument_chars),

    redirections: ($) => repeat1($.redirection),

    redirection: ($) =>
      choice(
        $.merging_redirection_operator,
        seq($.file_redirection_operator, $.redirected_file_name),
      ),

    redirected_file_name: ($) =>
      choice($._command_argument, $._primary_expression),

    // Class
    class_attribute: ($) =>
      choice(token(reservedWord('hidden')), token(reservedWord('static'))),

    class_property_definition: ($) =>
      seq(
        optional($.attribute),
        repeat($.class_attribute),
        optional($.type_literal),
        $.variable,
        optional(seq('=', $._expression)),
      ),

    class_method_parameter: ($) => seq(optional($.type_literal), $.variable),

    class_method_parameter_list: ($) =>
      seq($.class_method_parameter, repeat(seq(',', $.class_method_parameter))),

    class_method_definition: ($) =>
      seq(
        optional($.attribute),
        repeat($.class_attribute),
        optional($.type_literal),
        $.simple_name,
        '(',
        optional($.class_method_parameter_list),
        ')',
        optional($.class_method_base_ctor),
        '{',
        optional($.script_block),
        '}',
      ),

    class_method_base_ctor: ($) =>
      seq(
        ':',
        choice(reservedWord('base'), reservedWord('this')),
        $.argument_list,
      ),

    class_statement: ($) =>
      seq(
        optional($.attribute_list),
        token(reservedWord('class')),
        $.simple_name,
        optional(seq(':', $.type_spec, repeat(seq(',', $.type_spec)))),
        '{',
        repeat(
          choice(
            seq(
              $.class_property_definition,
              $._statement_boundary,
              repeat(';'),
            ),
            $.class_method_definition,
          ),
        ),
        '}',
      ),

    // Enums
    enum_statement: ($) =>
      seq(
        optional($.attribute_list),
        token(reservedWord('enum')),
        $.simple_name,
        '{',
        repeat(seq($.enum_member, $._statement_boundary, repeat(';'))),
        '}',
      ),

    enum_member: ($) =>
      seq($.simple_name, optional(seq('=', $.integer_literal))),

    // Expressions
    _expression: ($) => $.ternary_expression,

    ternary_expression: ($) =>
      prec.right(
        choice(
          $.null_coalesce_expression,
          seq(
            $.null_coalesce_expression,
            '?',
            $.ternary_expression,
            ':',
            $.ternary_expression,
          ),
        ),
      ),

    null_coalesce_expression: ($) =>
      prec.left(
        choice(
          $.logical_expression,
          seq($.null_coalesce_expression, '??', $.logical_expression),
        ),
      ),

    logical_expression: ($) =>
      prec.left(
        choice(
          $.bitwise_expression,
          seq(
            $.logical_expression,
            choice(
              reservedWord('-and'),
              reservedWord('-or'),
              reservedWord('-xor'),
            ),
            $.bitwise_expression,
          ),
        ),
      ),

    bitwise_expression: ($) =>
      prec.left(
        choice(
          $.comparison_expression,
          seq(
            $.bitwise_expression,
            choice(
              reservedWord('-band'),
              reservedWord('-bor'),
              reservedWord('-bxor'),
            ),
            $.comparison_expression,
          ),
        ),
      ),

    comparison_expression: ($) =>
      prec.left(
        choice(
          $.additive_expression,
          seq(
            $.comparison_expression,
            $.comparison_operator,
            $.additive_expression,
          ),
        ),
      ),

    additive_expression: ($) =>
      prec.left(
        choice(
          $.multiplicative_expression,
          seq(
            $.additive_expression,
            choice('+', '-'),
            $.multiplicative_expression,
          ),
        ),
      ),

    multiplicative_expression: ($) =>
      prec.left(
        choice(
          $.format_expression,
          seq(
            $.multiplicative_expression,
            choice('/', '\\', '%', '*'),
            $.format_expression,
          ),
        ),
      ),

    format_expression: ($) =>
      prec.left(
        choice(
          $.range_expression,
          seq($.format_expression, $.format_operator, $.range_expression),
        ),
      ),

    range_expression: ($) =>
      prec.left(
        choice(
          $.array_literal_expression,
          seq($.range_expression, '..', $.array_literal_expression),
        ),
      ),

    array_literal_expression: ($) =>
      prec.left(seq($.unary_expression, repeat(seq(',', $.unary_expression)))),

    unary_expression: ($) =>
      prec.right(
        choice($._primary_expression, $.expression_with_unary_operator),
      ),

    expression_with_unary_operator: ($) =>
      choice(
        seq(',', $.unary_expression),
        ...nonCommaUnaryExpressionOperators($),
      ),

    pre_increment_expression: ($) => seq('++', $.unary_expression),
    pre_decrement_expression: ($) => seq('--', $.unary_expression),

    cast_expression: ($) =>
      prec(
        PREC.CAST,
        seq(
          $.type_literal,
          alias($._cast_expression_operand, $.unary_expression),
        ),
      ),

    // A cast operand may not start with the comma unary form. Otherwise
    // `[int], $next` is swallowed as the cast target instead of ending the
    // type literal before the separator.
    _cast_expression_operand: ($) =>
      prec.right(
        choice(
          $._primary_expression,
          alias(
            $._non_comma_expression_with_unary_operator,
            $.expression_with_unary_operator,
          ),
        ),
      ),

    _non_comma_expression_with_unary_operator: ($) =>
      choice(...nonCommaUnaryExpressionOperators($)),

    attributed_variable: ($) => seq($.type_literal, $.variable),

    _primary_expression: ($) =>
      choice(
        $._value,
        $.member_access,
        $.element_access,
        $.invokation_expression,
        $.post_increment_expression,
        $.post_decrement_expression,
      ),

    _value: ($) =>
      choice(
        $.parenthesized_expression,
        $.sub_expression,
        $.array_expression,
        $.script_block_expression,
        $.hash_literal_expression,
        $._literal,
        $.type_literal,
        $.variable,
      ),

    parenthesized_expression: ($) => seq('(', $.pipeline, ')'),

    sub_expression: ($) =>
      seq('$(', field('statements', optional($.statement_list)), ')'),

    array_expression: ($) =>
      seq('@(', field('statements', optional($.statement_list)), ')'),

    script_block_expression: ($) =>
      seq('{', optional($.param_block), optional($.script_block), '}'),

    hash_literal_expression: ($) =>
      seq('@{', optional($.hash_literal_body), '}'),

    hash_literal_body: ($) => repeat1($.hash_entry),

    hash_entry: ($) =>
      seq(
        $.key_expression,
        '=',
        $._statement,
        $._statement_boundary,
        repeat(';'),
      ),

    key_expression: ($) => choice($.simple_name, $.unary_expression),

    post_increment_expression: ($) =>
      prec(PREC.UNARY, seq($._primary_expression, '++')),

    post_decrement_expression: ($) =>
      prec(PREC.UNARY, seq($._primary_expression, '--')),

    member_access: ($) =>
      prec.left(
        choice(
          seq($._primary_expression, token.immediate('.'), $.member_name),
          seq($._primary_expression, '::', $.member_name),
        ),
      ),

    member_name: ($) =>
      choice(
        $.simple_name,
        $.string_literal,
        $.expression_with_unary_operator,
        $._value,
      ),

    element_access: ($) =>
      prec(
        PREC.ELEMENT_ACCESS,
        seq($._primary_expression, '[', $._expression, ']'),
      ),

    invokation_expression: ($) =>
      choice(
        seq(
          $._primary_expression,
          token.immediate('.'),
          $.member_name,
          $.argument_list,
        ),
        seq($._primary_expression, '::', $.member_name, $.argument_list),
        $.invokation_foreach_expression,
        $.invokation_where_expression,
      ),

    // adding this rule to handle .foreach syntax
    invokation_foreach_expression: ($) =>
      seq(
        $._primary_expression,
        token.immediate(reservedWord('.foreach')),
        choice($.script_block_expression, $.argument_list),
      ),

    // adding this rule to handle .where syntax
    invokation_where_expression: ($) =>
      seq(
        $._primary_expression,
        token.immediate(reservedWord('.where')),
        choice($.script_block_expression, $.argument_list),
      ),

    argument_list: ($) =>
      seq(
        '(',
        field('argument_expression_list', optional($.argument_expression_list)),
        ')',
      ),

    argument_expression_list: ($) =>
      prec.left(
        seq($.argument_expression, repeat(seq(',', $.argument_expression))),
      ),

    argument_expression: ($) => $.ternary_argument_expression,

    ternary_argument_expression: ($) =>
      prec.right(
        choice(
          $.null_coalesce_argument_expression,
          seq(
            $.null_coalesce_argument_expression,
            '?',
            $.ternary_argument_expression,
            ':',
            $.ternary_argument_expression,
          ),
        ),
      ),

    null_coalesce_argument_expression: ($) =>
      prec.left(
        choice(
          $.logical_argument_expression,
          seq(
            $.null_coalesce_argument_expression,
            '??',
            $.logical_argument_expression,
          ),
        ),
      ),

    logical_argument_expression: ($) =>
      prec.left(
        choice(
          $.bitwise_argument_expression,
          seq(
            $.logical_argument_expression,
            choice(
              reservedWord('-and'),
              reservedWord('-or'),
              reservedWord('-xor'),
            ),
            $.bitwise_argument_expression,
          ),
        ),
      ),

    bitwise_argument_expression: ($) =>
      prec.left(
        choice(
          $.comparison_argument_expression,
          seq(
            $.bitwise_argument_expression,
            choice(
              reservedWord('-band'),
              reservedWord('-bor'),
              reservedWord('-bxor'),
            ),
            $.comparison_argument_expression,
          ),
        ),
      ),

    comparison_argument_expression: ($) =>
      prec.left(
        choice(
          $.additive_argument_expression,
          seq(
            $.comparison_argument_expression,
            $.comparison_operator,
            $.additive_argument_expression,
          ),
        ),
      ),

    additive_argument_expression: ($) =>
      prec.left(
        choice(
          $.multiplicative_argument_expression,
          seq(
            $.additive_argument_expression,
            choice('+', '-'),
            $.multiplicative_argument_expression,
          ),
        ),
      ),

    multiplicative_argument_expression: ($) =>
      prec.left(
        choice(
          $.format_argument_expression,
          seq(
            $.multiplicative_argument_expression,
            choice('/', '\\', '%', '*'),
            $.format_argument_expression,
          ),
        ),
      ),

    format_argument_expression: ($) =>
      prec.left(
        choice(
          $.range_argument_expression,
          seq(
            $.format_argument_expression,
            $.format_operator,
            $.range_argument_expression,
          ),
        ),
      ),

    range_argument_expression: ($) =>
      prec.left(
        choice(
          $.unary_expression,
          seq($.range_argument_expression, '..', $.unary_expression),
        ),
      ),

    type_literal: ($) =>
      seq('[', $.type_spec, optional($.assembly_qualifier), ']'),

    type_spec: ($) =>
      choice(
        seq($.array_type_name, optional($.dimension), ']'),
        seq($.generic_type_name, $.generic_type_arguments, ']'),
        $.type_name,
      ),

    // Assembly-qualified type name tail at the outermost `[...]`, e.g.
    // `[Int32, mscorlib]`, or with full AssemblyQualifiedName metadata:
    // `[Foo, Bar, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null]`.
    assembly_qualifier: ($) => seq(',', $.assembly_name),

    assembly_name: ($) =>
      seq($.type_name, repeat(seq(',', $.assembly_attribute))),

    // An AssemblyName metadata entry: `Key=Value`. PowerShell's parser
    // accepts the values emitted by AssemblyName.FullName: dotted
    // versions, identifiers (`neutral`, `null`, `Yes`, `MSIL`), and hex
    // public-key tokens.
    assembly_attribute: ($) =>
      seq($.assembly_attribute_name, '=', $.assembly_attribute_value),

    assembly_attribute_name: ($) => $.simple_name,

    assembly_attribute_value: ($) => /[A-Za-z0-9._]+/,

    dimension: ($) => repeat1(','),

    generic_type_arguments: ($) =>
      seq($.type_spec, repeat(seq(',', $.type_spec))),

    // Attributes
    attribute_list: ($) => repeat1($.attribute),

    _attribute_expression: ($) =>
      seq(
        '[',
        $.attribute_name,
        '(',
        optional($.attribute_arguments),
        ')',
        ']',
      ),

    attribute: ($) =>
      choice(
        $._attribute_expression,
        $.type_literal,
      ),

    attribute_name: ($) => $.type_spec,

    attribute_arguments: ($) =>
      seq($.attribute_argument, repeat(seq(',', $.attribute_argument))),

    attribute_argument: ($) =>
      choice(
        $._expression,
        seq($.simple_name, optional(seq('=', $._expression))),
      ),
  },
});

// inspired from https://github.com/tree-sitter/tree-sitter/issues/261
/**
 * Creates a rule to match a case insensitive reserved keyword
 *
 * @param {string} word
 */
function reservedWord(word) {
  // return word // when debuging
  return alias(reserved(caseInsensitive(word)), word);
}

/**
 * Create a reserved regex keyword
 *
 * @param {string} regex
 */
function reserved(regex) {
  return prec(PREC.KEYWORD, new RegExp(regex));
}

/**
 * A `for (...)` clause boundary between two present clauses.
 * Empty clauses still require a literal `;` to avoid newline/formatting ambiguity.
 *
 * @param {GrammarSymbols<string>} $
 */
function forClauseSeparator($) {
  return choice(';', $._for_clause_break);
}

/**
 * @param {GrammarSymbols<string>} $
 */
function nonCommaUnaryExpressionOperators($) {
  return [
    seq(reservedWord('-not'), $.unary_expression),
    seq('!', $.unary_expression),
    seq(reservedWord('-bnot'), $.unary_expression),
    seq('+', $.unary_expression),
    seq('-', $.unary_expression),
    $.pre_increment_expression,
    $.pre_decrement_expression,
    $.cast_expression,
    seq(reservedWord('-split'), $.unary_expression),
    seq(reservedWord('-join'), $.unary_expression),
  ];
}

/**
 * Return case insensitive regex for a word
 *
 * @param {string} word
 */
function caseInsensitive(word) {
  return word
    .split('')
    .map((letter) => `[${letter}${letter.toUpperCase()}]`)
    .join('');
}

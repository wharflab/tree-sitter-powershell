import stylistic from '@stylistic/eslint-plugin';
import treesitter from 'eslint-config-treesitter';
import regexpPlugin from 'eslint-plugin-regexp';

export default [
  stylistic.configs.customize({
    quotes: 'single',
    semi: true,
    arrowParens: true,
  }),
  regexpPlugin.configs.recommended,
  ...treesitter,
];

import stylistic from '@stylistic/eslint-plugin';
import treesitter from 'eslint-config-treesitter';

export default [
  stylistic.configs.customize({
    quotes: 'single',
    semi: true,
    arrowParens: true,
  }),
  ...treesitter,
];

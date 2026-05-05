module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'off'
  }
};

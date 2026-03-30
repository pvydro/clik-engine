import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // TypeScript recommended
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',

      // Code quality
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],

      // Catch common mistakes
      'no-duplicate-case': 'error',
      'no-fallthrough': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable': 'error',
      'no-constant-binary-expression': 'error',
      'no-constructor-return': 'error',
      'no-promise-executor-return': 'warn',
      'no-self-assign': 'error',
      'no-unused-private-class-members': 'warn',

      // Style consistency
      'no-lonely-if': 'warn',
      'no-useless-return': 'warn',
      'prefer-template': 'warn',
      'object-shorthand': ['warn', 'always'],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts', '**/*.spec.ts'],
  },
];

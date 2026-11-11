import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-a',
      'dist-b',
      'coverage',
      'test-results',
      'playwright-report',
      '.egm',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ['scripts/**', 'e2e/**', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/screens/**', 'src/components/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['dexie'],
          patterns: ['**/db', '**/db/*'],
        },
      ],
    },
  },
);

// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // ── Hexagonal boundary: domain and application layers must stay framework-free ──
  // Prevents @nestjs/*, drizzle-orm, pg, bcryptjs, and infra folder imports from
  // leaking into domain or application layers. Pure business logic must not depend
  // on delivery mechanisms or persistence adapters.
  // Spec files are excluded: unit tests legitimately wire up in-memory fakes/stubs
  // from infrastructure without that constituting an architectural violation.
  {
    files: [
      'src/contexts/**/domain/**/*.ts',
      'src/contexts/**/application/**/*.ts',
      'src/shared/domain/**/*.ts',
    ],
    ignores: [
      'src/**/*.spec.ts',
      'src/**/*.int-spec.ts',
      'src/**/*.e2e-spec.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*'],
              message:
                'Domain/application must not import NestJS. Use a port and let infrastructure wire the adapter.',
            },
            {
              group: ['drizzle-orm', 'drizzle-orm/*'],
              message:
                'Domain/application must not import drizzle-orm. Use a repository port.',
            },
            {
              group: ['pg'],
              message:
                'Domain/application must not import pg. Use a repository port.',
            },
            {
              group: ['bcryptjs'],
              message:
                'Domain/application must not import bcryptjs. Use a PasswordHasher port.',
            },
            {
              group: ['**/infrastructure/**'],
              message:
                'Domain/application must not import from infrastructure. Invert the dependency via a port.',
            },
          ],
        },
      ],
    },
  },
);

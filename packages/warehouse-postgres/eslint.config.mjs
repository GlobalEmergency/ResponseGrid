// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Capa de persistencia (adapter): a diferencia de warehouse-core, aquí SÍ se
// permite drizzle-orm — es su razón de ser. Se mantiene la dependencia
// unidireccional: nunca importa de los hosts.
export default tseslint.config(
  {
    ignores: ['dist', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*'],
              message:
                'warehouse-postgres es una librería de persistencia: no puede importar NestJS.',
            },
            {
              group: ['**/apps/*', '@reliefhub/*'],
              message:
                'Dependencia unidireccional: warehouse-postgres nunca importa de los hosts.',
            },
          ],
        },
      ],
    },
  },
);

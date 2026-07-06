// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// Pureza de dominio del paquete: el núcleo no puede importar frameworks,
// ORM ni infraestructura. Réplica de la frontera hexagonal de apps/api,
// ajustada a la estructura de este paquete (todo src/ es dominio puro).
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
                'warehouse-core es dominio puro: no puede importar NestJS.',
            },
            {
              group: ['drizzle-orm', 'drizzle-orm/*', 'pg'],
              message:
                'warehouse-core es dominio puro: no puede importar ORM/driver de BD.',
            },
            {
              group: ['**/apps/*', '@reliefhub/*'],
              message:
                'Dependencia unidireccional: warehouse-core nunca importa de los hosts.',
            },
          ],
        },
      ],
    },
  },
);

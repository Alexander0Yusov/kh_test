import { join } from 'node:path';
import { defineConfig, env } from 'prisma/config';

const environment = process.env.NODE_ENV ?? 'development';

process.loadEnvFile(
  join(process.cwd(), 'apps', 'micro-post-service', `.env.${environment}`),
);

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: env('PRISMA_DB_URL'),
  },
});

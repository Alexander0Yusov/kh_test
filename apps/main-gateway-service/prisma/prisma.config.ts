import { join } from 'node:path';
import { defineConfig, env } from 'prisma/config';
import { loadServiceEnvironment } from '../../../libs/common/src/config';

loadServiceEnvironment(join(process.cwd(), 'apps', 'main-gateway-service'));

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    path: './migrations',
  },
  datasource: {
    url: env('PRISMA_DB_URL'),
  },
});

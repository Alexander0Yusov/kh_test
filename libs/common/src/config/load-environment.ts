import { join } from 'node:path';
import { loadEnvFile } from './load-env-file';
import { resolveAppEnvironment } from './app-environment';

export function loadServiceEnvironment(serviceRoot: string): void {
  const environment = resolveAppEnvironment(process.env.NODE_ENV);
  process.env.NODE_ENV = environment;

  if (environment === 'production') {
    return;
  }

  loadEnvFile(join(serviceRoot, `.env.${environment}`));
}

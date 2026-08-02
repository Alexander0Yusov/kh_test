import { join } from 'node:path';
import { loadEnvFile } from './load-env-file';
import { resolveAppEnvironment } from './app-environment';

export function loadServiceEnvironment(serviceRoot: string): void {
  const environment = resolveAppEnvironment(process.env.NODE_ENV);

  if (environment === 'production') {
    process.env.NODE_ENV = environment;
    return;
  }

  loadEnvFile(join(process.cwd(), `.env.${environment}`));

  if (process.env.NODE_ENV === undefined) {
    throw new Error('Common environment file must define NODE_ENV.');
  }

  const commonEnvironment = resolveAppEnvironment(process.env.NODE_ENV);

  if (commonEnvironment !== environment) {
    throw new Error(
      'Common environment NODE_ENV does not match the selected environment.',
    );
  }

  loadEnvFile(join(serviceRoot, `.env.${environment}`));
}

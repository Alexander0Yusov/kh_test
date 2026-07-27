import { existsSync, readFileSync } from 'node:fs';
import { parseEnvFile } from './parse-env-file';

export function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`Environment file was not found: ${filePath}`);
  }

  const rawContent = readFileSync(filePath, 'utf8');
  const envEntries = parseEnvFile(rawContent);

  for (const [key, value] of Object.entries(envEntries)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

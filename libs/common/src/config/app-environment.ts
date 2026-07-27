export type AppEnvironment = 'development' | 'testing' | 'production';

export const SUPPORTED_ENVIRONMENTS: readonly AppEnvironment[] = [
  'development',
  'testing',
  'production',
] as const;

export function resolveAppEnvironment(
  value: string | undefined,
): AppEnvironment {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return 'development';
  }

  if (!SUPPORTED_ENVIRONMENTS.includes(normalizedValue as AppEnvironment)) {
    throw new Error(
      `Unsupported NODE_ENV value: ${normalizedValue}. Use development, testing or production.`,
    );
  }

  return normalizedValue as AppEnvironment;
}

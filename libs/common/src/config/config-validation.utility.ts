import { validateSync, type ValidationError } from 'class-validator';

export const configValidationUtility = {
  validateConfig: (config: object): void => {
    const errors: ValidationError[] = validateSync(config);

    if (errors.length > 0) {
      const sortedMessages = errors
        .map((error: ValidationError) => {
          const constraints = (error.constraints || {}) as Record<
            string,
            string
          >;
          return Object.values(constraints).join(', ');
        })
        .join('; ');

      throw new Error(`Validation failed: ${sortedMessages}`);
    }
  },

  convertToBoolean(value: string): boolean | null {
    const trimmedValue = value?.trim();

    if (trimmedValue === 'true') return true;
    if (trimmedValue === '1') return true;
    if (trimmedValue === 'enabled') return true;
    if (trimmedValue === 'false') return false;
    if (trimmedValue === '0') return false;
    if (trimmedValue === 'disabled') return false;

    return null;
  },

  getEnumValues<T extends Record<string, string>>(enumObj: T): string[] {
    return Object.values(enumObj);
  },
};

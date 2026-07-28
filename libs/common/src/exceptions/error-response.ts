import { DomainException } from './domain-exception';

export interface ErrorResponse {
  code: string;
  message: string;
  field: string | null;
  // The explicit null is part of the public wire contract.
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  details: unknown | null;
}

export function toErrorResponse(exception: DomainException): ErrorResponse {
  const firstExtension = exception.extensions[0];

  return {
    code: exception.code,
    message: firstExtension?.message ?? exception.message,
    field: firstExtension?.field ?? null,
    details: null,
  };
}

export function internalErrorResponse(): ErrorResponse {
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    field: null,
    details: null,
  };
}

export function serializeErrorResponse(response: ErrorResponse): string {
  return JSON.stringify(response);
}

export function parseErrorResponse(value: string): ErrorResponse | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!isRecord(parsed)) {
      return null;
    }

    if (
      typeof parsed.code !== 'string' ||
      typeof parsed.message !== 'string' ||
      !isNullableString(parsed.field) ||
      !Object.hasOwn(parsed, 'details')
    ) {
      return null;
    }

    return {
      code: parsed.code,
      message: parsed.message,
      field: parsed.field,
      details: parsed.details ?? null,
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import {
  PostQueryRepository,
  type RootPostPageItem,
  type RootPostPosition,
  type RootPostSortBy,
  type SortDirection,
} from '../contracts/post-query.repository';

export type PostOptionalField =
  'avatar' | 'userName' | 'email' | 'homePage' | 'publishDate' | 'attachment';

type CursorRules = {
  sortBy: RootPostSortBy;
  sortDirection: SortDirection;
  limit: number;
  fields: PostOptionalField[];
};

type CursorState = CursorRules & {
  value?: string;
  id?: string;
};

const DEFAULT_FIELDS: PostOptionalField[] = [
  'avatar',
  'userName',
  'email',
  'homePage',
  'publishDate',
  'attachment',
];
const FIELD_ORDER = new Map(
  DEFAULT_FIELDS.map((field, index) => [field, index]),
);
const SORT_VALUES: RootPostSortBy[] = ['createdAt', 'userName', 'email'];
const DIRECTION_VALUES: SortDirection[] = ['asc', 'desc'];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export class GetRootPostsQuery {
  public constructor(
    public readonly cursor: string | null,
    public readonly sortBy?: RootPostSortBy,
    public readonly sortDirection?: SortDirection,
    public readonly limit?: number,
    public readonly fields?: PostOptionalField[],
  ) {}
}

export type GetRootPostsResult = {
  rootIds: string[];
  nextCursor?: string;
  hasMore: boolean;
  resolvedFields: PostOptionalField[];
};

@QueryHandler(GetRootPostsQuery)
export class GetRootPostsHandler implements IQueryHandler<
  GetRootPostsQuery,
  GetRootPostsResult
> {
  public constructor(
    private readonly postQueryRepository: PostQueryRepository,
  ) {}

  public async execute(query: GetRootPostsQuery): Promise<GetRootPostsResult> {
    const cursorState =
      query.cursor === null ? null : decodeCursor(query.cursor);
    const previousRules = cursorState ?? defaultRules();
    const rules = applyOverrides(previousRules, query);
    const position =
      cursorState !== null && rulesEqual(previousRules, rules)
        ? cursorPosition(cursorState)
        : null;
    const rows = await this.postQueryRepository.findRootPage({
      sortBy: rules.sortBy,
      sortDirection: rules.sortDirection,
      limitPlusOne: rules.limit + 1,
      position,
    });
    const hasMore = rows.length > rules.limit;
    const page = rows.slice(0, rules.limit);
    const last = page.at(-1);

    return {
      rootIds: page.map(({ id }) => id),
      nextCursor:
        hasMore && last !== undefined
          ? encodeCursor({
              ...rules,
              value: sortValue(last, rules.sortBy),
              id: last.id,
            })
          : undefined,
      hasMore,
      resolvedFields: rules.fields,
    };
  }
}

function defaultRules(): CursorRules {
  return {
    sortBy: 'createdAt',
    sortDirection: 'desc',
    limit: 25,
    fields: [...DEFAULT_FIELDS],
  };
}

function applyOverrides(
  current: CursorRules,
  query: GetRootPostsQuery,
): CursorRules {
  const limit = query.limit ?? current.limit;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw validationException('limit');
  }

  return {
    sortBy: query.sortBy ?? current.sortBy,
    sortDirection: query.sortDirection ?? current.sortDirection,
    limit,
    fields:
      query.fields === undefined
        ? [...current.fields]
        : normalizeFields(query.fields, 'fields'),
  };
}

function decodeCursor(cursor: string): CursorState {
  try {
    if (
      !BASE64URL_PATTERN.test(cursor) ||
      Buffer.from(cursor, 'base64url').toString('base64url') !== cursor
    ) {
      throw new Error('Invalid Base64URL');
    }

    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );

    if (!isRecord(parsed)) {
      throw new Error('Invalid cursor object');
    }

    const sortBy = parsed.sortBy;
    const sortDirection = parsed.sortDirection;
    const limit = parsed.limit;
    const fields = parsed.fields;
    const value = parsed.value;
    const id = parsed.id;

    if (
      !isRootPostSortBy(sortBy) ||
      !isSortDirection(sortDirection) ||
      !Number.isInteger(limit) ||
      (limit as number) < 1 ||
      (limit as number) > 50 ||
      !Array.isArray(fields)
    ) {
      throw new Error('Invalid cursor rules');
    }

    const hasValue = typeof value === 'string';
    const hasId = typeof id === 'string';

    if (
      hasValue !== hasId ||
      (hasId && !UUID_PATTERN.test(id)) ||
      (hasValue && sortBy === 'createdAt' && !isCanonicalIsoDate(value)) ||
      (value !== undefined && !hasValue) ||
      (id !== undefined && !hasId)
    ) {
      throw new Error('Invalid cursor position');
    }

    return {
      sortBy,
      sortDirection,
      limit: limit as number,
      fields: normalizeFields(fields, 'cursor'),
      ...(hasValue ? { value: value, id: id } : {}),
    };
  } catch {
    throw validationException('cursor');
  }
}

function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

function normalizeFields(
  fields: unknown[],
  errorField: 'fields' | 'cursor',
): PostOptionalField[] {
  if (!fields.every(isPostOptionalField)) {
    throw validationException(errorField);
  }

  return [...new Set(fields)].sort(
    (left, right) =>
      (FIELD_ORDER.get(left) ?? 0) - (FIELD_ORDER.get(right) ?? 0),
  );
}

function rulesEqual(left: CursorRules, right: CursorRules): boolean {
  return (
    left.sortBy === right.sortBy &&
    left.sortDirection === right.sortDirection &&
    left.limit === right.limit &&
    left.fields.length === right.fields.length &&
    left.fields.every((field, index) => field === right.fields[index])
  );
}

function cursorPosition(state: CursorState): RootPostPosition | null {
  return state.value === undefined || state.id === undefined
    ? null
    : { value: state.value, id: state.id };
}

function sortValue(row: RootPostPageItem, sortBy: RootPostSortBy): string {
  switch (sortBy) {
    case 'createdAt':
      return row.createdAt.toISOString();
    case 'userName':
      return row.userName;
    case 'email':
      return row.email;
  }
}

function isRootPostSortBy(value: unknown): value is RootPostSortBy {
  return (
    typeof value === 'string' && SORT_VALUES.includes(value as RootPostSortBy)
  );
}

function isSortDirection(value: unknown): value is SortDirection {
  return (
    typeof value === 'string' &&
    DIRECTION_VALUES.includes(value as SortDirection)
  );
}

function isPostOptionalField(value: unknown): value is PostOptionalField {
  return (
    typeof value === 'string' && FIELD_ORDER.has(value as PostOptionalField)
  );
}

function isCanonicalIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationException(field: string): DomainException {
  return new DomainException({
    code: DomainExceptionCode.ValidationFailed,
    message: 'Validation failed.',
    extensions: [{ field, message: 'Validation failed.' }],
  });
}

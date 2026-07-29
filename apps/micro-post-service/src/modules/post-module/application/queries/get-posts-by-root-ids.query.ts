import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../../libs/common/src';
import {
  PostQueryRepository,
  type PostTreeRow,
} from '../contracts/post-query.repository';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class GetPostsByRootIdsQuery {
  public constructor(public readonly rootIds: string[]) {}
}

export type GetPostsByRootIdsResult = {
  posts: PostTreeRow[];
};

@QueryHandler(GetPostsByRootIdsQuery)
export class GetPostsByRootIdsHandler implements IQueryHandler<
  GetPostsByRootIdsQuery,
  GetPostsByRootIdsResult
> {
  public constructor(
    private readonly postQueryRepository: PostQueryRepository,
  ) {}

  public async execute(
    query: GetPostsByRootIdsQuery,
  ): Promise<GetPostsByRootIdsResult> {
    if (!query.rootIds.every((rootId) => UUID_PATTERN.test(rootId))) {
      throw validationException();
    }

    const rootIds = [...new Set(query.rootIds)];

    if (rootIds.length > 50) {
      throw validationException();
    }

    if (rootIds.length === 0) {
      return { posts: [] };
    }

    const rows = await this.postQueryRepository.findByRootIds(rootIds);
    const foundRootIds = new Set(
      rows
        .filter(({ id, parentId }) => parentId === null && rootIds.includes(id))
        .map(({ id }) => id),
    );
    const groups = new Map<string, PostTreeRow[]>();

    for (const rootId of rootIds) {
      if (foundRootIds.has(rootId)) {
        groups.set(rootId, []);
      }
    }

    for (const post of rows) {
      const effectiveRootId = post.parentId === null ? post.id : post.rootId;

      if (effectiveRootId !== null && groups.has(effectiveRootId)) {
        groups.get(effectiveRootId)?.push(post);
      }
    }

    return {
      posts: rootIds.flatMap((rootId) =>
        (groups.get(rootId) ?? []).sort(compareMaterializedPath),
      ),
    };
  }
}

function compareMaterializedPath(
  left: PostTreeRow,
  right: PostTreeRow,
): number {
  const leftSegments = left.path.split('.').map(Number);
  const rightSegments = right.path.split('.').map(Number);
  const length = Math.max(leftSegments.length, rightSegments.length);

  for (let index = 0; index < length; index += 1) {
    const leftSegment = leftSegments[index];
    const rightSegment = rightSegments[index];

    if (leftSegment === undefined) {
      return -1;
    }

    if (rightSegment === undefined) {
      return 1;
    }

    if (leftSegment !== rightSegment) {
      return leftSegment - rightSegment;
    }
  }

  return left.id.localeCompare(right.id);
}

function validationException(): DomainException {
  return new DomainException({
    code: DomainExceptionCode.ValidationFailed,
    message: 'Validation failed.',
    extensions: [{ field: 'rootIds', message: 'Validation failed.' }],
  });
}

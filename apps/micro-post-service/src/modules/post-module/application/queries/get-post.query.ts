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

export class GetPostQuery {
  public constructor(public readonly postId: string) {}
}

export type GetPostResult = PostTreeRow;

@QueryHandler(GetPostQuery)
export class GetPostHandler implements IQueryHandler<
  GetPostQuery,
  GetPostResult
> {
  public constructor(
    private readonly postQueryRepository: PostQueryRepository,
  ) {}

  public async execute(query: GetPostQuery): Promise<GetPostResult> {
    if (!UUID_PATTERN.test(query.postId)) {
      throw postException(DomainExceptionCode.ValidationFailed);
    }

    const post = await this.postQueryRepository.findById(query.postId);

    if (post === null) {
      throw postException(DomainExceptionCode.NotFound);
    }

    return post;
  }
}

function postException(code: DomainExceptionCode): DomainException {
  const message =
    code === DomainExceptionCode.NotFound
      ? 'Post was not found.'
      : 'Validation failed.';

  return new DomainException({
    code,
    message,
    extensions: [{ field: 'postId', message }],
  });
}

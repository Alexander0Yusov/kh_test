import { QueryBus } from '@nestjs/cqrs';
import { Catch, UseFilters } from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  ID,
  Info,
  Int,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
  type GqlExceptionFilter,
} from '@nestjs/graphql';
import { GraphQLError, type GraphQLResolveInfo } from 'graphql';
import {
  DomainException,
  toErrorResponse,
} from '../../../../../../../libs/common/src';
import {
  GetPostQuery,
  type GetPostResult,
} from '../../application/queries/get-post.query';
import {
  GetPostsQuery,
  type GetPostsResult,
} from '../../application/queries/get-posts.query';
import type {
  RootPostSortBy,
  SortDirection as ApplicationSortDirection,
} from '../../application/contracts/posts.client';
import { isArgumentSpecified, selectedPostFields } from './post-selection';

export enum PostSortField {
  CREATED_AT = 'CREATED_AT',
  USER_NAME = 'USER_NAME',
  EMAIL = 'EMAIL',
}

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(PostSortField, { name: 'PostSortField' });
registerEnumType(SortDirection, { name: 'SortDirection' });

@ObjectType('Post')
export class GraphqlPost {
  @Field(() => ID)
  public id!: string;

  @Field(() => ID, { nullable: true })
  public parentId!: string | null;

  @Field(() => ID, { nullable: true })
  public rootId!: string | null;

  @Field()
  public path!: string;

  @Field()
  public message!: string;

  @Field()
  public userName!: string;

  @Field()
  public email!: string;

  @Field(() => String, { nullable: true })
  public homePage!: string | null;

  @Field(() => GraphQLISODateTime)
  public publishDate!: Date;

  @Field(() => String, { nullable: true })
  public avatarUrl!: string | null;

  @Field(() => String, { nullable: true })
  public attachmentUrl!: string | null;
}

@ObjectType()
export class PostsConnection {
  @Field(() => [GraphqlPost])
  public items!: GraphqlPost[];

  @Field(() => String, { nullable: true })
  public nextCursor!: string | null;

  @Field()
  public hasMore!: boolean;
}

@Catch()
class GraphqlExceptionFilter implements GqlExceptionFilter {
  public catch(exception: unknown): Error {
    return toGraphqlError(exception);
  }
}

@Resolver(() => GraphqlPost)
@UseFilters(GraphqlExceptionFilter)
export class PostsResolver {
  public constructor(private readonly queryBus: QueryBus) {}

  @Query(() => PostsConnection)
  public async posts(
    @Info() info: GraphQLResolveInfo,
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('sortBy', {
      type: () => PostSortField,
      defaultValue: PostSortField.CREATED_AT,
    })
    sortBy?: PostSortField,
    @Args('sortDirection', {
      type: () => SortDirection,
      defaultValue: SortDirection.DESC,
    })
    sortDirection?: SortDirection,
    @Args('limit', { type: () => Int, defaultValue: 25 })
    limit?: number,
  ): Promise<PostsConnection> {
    try {
      const result = await this.queryBus.execute<GetPostsQuery, GetPostsResult>(
        new GetPostsQuery(
          cursor,
          isArgumentSpecified(info, 'sortBy')
            ? toApplicationSortBy(sortBy)
            : undefined,
          isArgumentSpecified(info, 'sortDirection')
            ? toApplicationSortDirection(sortDirection)
            : undefined,
          isArgumentSpecified(info, 'limit') ? limit : undefined,
          selectedPostFields(info, true),
        ),
      );

      return {
        items: result.items as GraphqlPost[],
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    } catch (error: unknown) {
      throw toGraphqlError(error);
    }
  }

  @Query(() => GraphqlPost)
  public async post(
    @Args('id', { type: () => ID }) id: string,
    @Info() info: GraphQLResolveInfo,
  ): Promise<GraphqlPost> {
    try {
      return (await this.queryBus.execute<GetPostQuery, GetPostResult>(
        new GetPostQuery(id, selectedPostFields(info, false)),
      )) as GraphqlPost;
    } catch (error: unknown) {
      throw toGraphqlError(error);
    }
  }
}

function toApplicationSortBy(
  value?: PostSortField,
): RootPostSortBy | undefined {
  switch (value) {
    case PostSortField.CREATED_AT:
      return 'createdAt';
    case PostSortField.USER_NAME:
      return 'userName';
    case PostSortField.EMAIL:
      return 'email';
    case undefined:
      return undefined;
  }
}

function toApplicationSortDirection(
  value?: SortDirection,
): ApplicationSortDirection | undefined {
  switch (value) {
    case SortDirection.ASC:
      return 'asc';
    case SortDirection.DESC:
      return 'desc';
    case undefined:
      return undefined;
  }
}

function toGraphqlError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }
  if (error instanceof DomainException) {
    const response = toErrorResponse(error);
    return new GraphQLError(response.message, {
      extensions: {
        code: response.code,
        field: response.field,
        details: response.details,
      },
    });
  }

  return new GraphQLError('Internal server error', {
    extensions: {
      code: 'INTERNAL_SERVER_ERROR',
      field: null,
      details: null,
    },
  });
}

import {
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  Kind,
  type FieldNode,
  type GraphQLResolveInfo,
  type SelectionNode,
  type SelectionSetNode,
} from 'graphql';
import type { PostOptionalField } from '../../application/contracts/posts.client';

const OPTIONAL_FIELD_BY_GRAPHQL_NAME: Readonly<
  Partial<Record<string, PostOptionalField>>
> = {
  avatarUrl: 'avatar',
  homePage: 'homePage',
  email: 'email',
  attachmentUrl: 'attachment',
  publishDate: 'publishDate',
};

export function selectedPostFields(
  info: GraphQLResolveInfo,
  connection: boolean,
): PostOptionalField[] {
  const selections = info.fieldNodes.flatMap((node) =>
    node.selectionSet === undefined
      ? []
      : connection
        ? findItemsSelections(node.selectionSet, info)
        : [node.selectionSet],
  );
  const fields = new Set<PostOptionalField>();

  for (const selectionSet of selections) {
    collectPostFields(selectionSet, info, fields);
  }

  return [...fields];
}

export function isArgumentSpecified(
  info: GraphQLResolveInfo,
  argumentName: string,
): boolean {
  return info.fieldNodes.some((node) =>
    node.arguments?.some((argument) => argument.name.value === argumentName),
  );
}

function findItemsSelections(
  selectionSet: SelectionSetNode,
  info: GraphQLResolveInfo,
): SelectionSetNode[] {
  const result: SelectionSetNode[] = [];

  for (const selection of selectionSet.selections) {
    if (!shouldInclude(selection, info)) {
      continue;
    }
    if (selection.kind === Kind.FIELD) {
      if (
        selection.name.value === 'items' &&
        selection.selectionSet !== undefined
      ) {
        result.push(selection.selectionSet);
      }
      continue;
    }
    const nested = fragmentSelectionSet(selection, info);
    if (nested !== undefined) {
      result.push(...findItemsSelections(nested, info));
    }
  }

  return result;
}

function collectPostFields(
  selectionSet: SelectionSetNode,
  info: GraphQLResolveInfo,
  fields: Set<PostOptionalField>,
): void {
  for (const selection of selectionSet.selections) {
    if (!shouldInclude(selection, info)) {
      continue;
    }
    if (selection.kind === Kind.FIELD) {
      const field = OPTIONAL_FIELD_BY_GRAPHQL_NAME[selection.name.value];
      if (field !== undefined) {
        fields.add(field);
      }
      continue;
    }
    const nested = fragmentSelectionSet(selection, info);
    if (nested !== undefined) {
      collectPostFields(nested, info, fields);
    }
  }
}

function fragmentSelectionSet(
  selection: Exclude<SelectionNode, FieldNode>,
  info: GraphQLResolveInfo,
): SelectionSetNode | undefined {
  return selection.kind === Kind.INLINE_FRAGMENT
    ? selection.selectionSet
    : info.fragments[selection.name.value]?.selectionSet;
}

function shouldInclude(node: SelectionNode, info: GraphQLResolveInfo): boolean {
  const skip = getDirectiveValues(
    GraphQLSkipDirective,
    node,
    info.variableValues,
  );
  if (skip?.if === true) {
    return false;
  }

  const include = getDirectiveValues(
    GraphQLIncludeDirective,
    node,
    info.variableValues,
  );
  return include?.if !== false;
}

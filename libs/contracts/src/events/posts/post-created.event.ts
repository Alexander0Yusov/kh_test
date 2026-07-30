export const POST_CREATED_ROUTING_KEY = 'posts.created';

export type PostCreatedEvent = {
  postId: string;
  userId: string;
  parentId: string | null;
  rootId: string | null;
  publishDate: string;
  userName: string;
  email: string;
  attachmentFileId: string | null;
};

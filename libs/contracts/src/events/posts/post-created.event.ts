export const POST_CREATED_ROUTING_KEY = 'posts.created';

export type PostCreatedEvent = {
  postId: string;
  userId: string;
  attachmentFileId: string | null;
};

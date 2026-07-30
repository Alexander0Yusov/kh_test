export const USER_CREATED_ROUTING_KEY = 'users.created';

export type UserCreatedEvent = {
  userId: string;
  avatarFileId: string;
};

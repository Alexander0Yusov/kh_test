export const USER_CREATED_ROUTING_KEY = 'users.created';

export type UserCreatedEvent = {
  userId: string;
  email: string;
  userName: string;
  avatarFileId: string;
};

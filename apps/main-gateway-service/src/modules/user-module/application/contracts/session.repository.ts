import { SessionEntity } from '../../domain';

export abstract class SessionRepository {
  public abstract save(session: SessionEntity): Promise<void>;

  public abstract findById(id: string): Promise<SessionEntity | null>;

  public abstract rotate(
    previousSession: SessionEntity,
    nextSession: SessionEntity,
  ): Promise<boolean>;
}

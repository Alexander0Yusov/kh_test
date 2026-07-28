import { SessionEntity } from '../../domain';

export abstract class SessionRepository {
  public abstract save(session: SessionEntity): Promise<void>;

  public abstract findById(id: string): Promise<SessionEntity | null>;
}

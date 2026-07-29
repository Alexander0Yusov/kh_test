import { FileEntity } from '../../domain';

export abstract class FileRepository {
  public abstract create(file: FileEntity): Promise<void>;

  public abstract findById(id: string): Promise<FileEntity | null>;

  public abstract findManyByIds(ids: string[]): Promise<FileEntity[]>;

  public abstract save(file: FileEntity): Promise<void>;
}

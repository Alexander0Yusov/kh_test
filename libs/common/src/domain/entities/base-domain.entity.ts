export type BaseDomainEntityProps = {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export abstract class BaseDomainEntity {
  protected readonly _id: string;

  protected readonly _createdAt: Date;

  protected _updatedAt: Date;

  protected _deletedAt: Date | null;

  protected constructor(props: BaseDomainEntityProps) {
    const createdAt = props.createdAt
      ? new Date(props.createdAt.getTime())
      : new Date();

    this._id = props.id;
    this._createdAt = createdAt;
    this._updatedAt = props.updatedAt
      ? new Date(props.updatedAt.getTime())
      : new Date(createdAt.getTime());
    this._deletedAt = props.deletedAt
      ? new Date(props.deletedAt.getTime())
      : null;
  }

  public get id(): string {
    return this._id;
  }

  public get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  public get updatedAt(): Date {
    return new Date(this._updatedAt.getTime());
  }

  public get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt.getTime()) : null;
  }

  public get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  protected touch(at: Date = new Date()): void {
    this._updatedAt = new Date(at.getTime());
  }

  public markAsDeleted(at: Date = new Date()): void {
    if (this._deletedAt !== null) {
      return;
    }

    const deletedAt = new Date(at.getTime());

    this._deletedAt = deletedAt;
    this._updatedAt = new Date(deletedAt.getTime());
  }

  public restore(at: Date = new Date()): void {
    if (this._deletedAt === null) {
      return;
    }

    this._deletedAt = null;
    this._updatedAt = new Date(at.getTime());
  }
}

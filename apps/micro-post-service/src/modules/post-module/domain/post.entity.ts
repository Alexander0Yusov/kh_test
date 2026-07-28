import {
  BaseDomainEntity,
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';

export type PostEntityProps = {
  id: string;
  userId: string;
  message: string;
  parentId?: string | null;
  rootId?: string | null;
  childCounter?: number;
  path?: string;
  attachmentFileId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export class PostEntity extends BaseDomainEntity {
  private readonly _userId: string;

  private readonly _parentId: string | null;

  private readonly _rootId: string | null;

  private readonly _childCounter: number;

  private readonly _path: string;

  private _message: string;

  private _attachmentFileId: string | null;

  public constructor(props: PostEntityProps) {
    super(props);

    const parentId = props.parentId ?? null;
    const rootId = props.rootId ?? null;
    const path = props.path ?? '1';

    if (parentId === null && rootId !== null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Root post cannot have a root ID',
        extensions: [
          {
            field: 'rootId',
            message: 'Root post cannot have a root ID',
          },
        ],
      });
    }

    if (parentId === null && path !== '1') {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Root post path must be "1"',
        extensions: [
          {
            field: 'path',
            message: 'Root post path must be "1"',
          },
        ],
      });
    }

    if (parentId !== null && rootId === null) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Reply post must have a root ID',
        extensions: [
          {
            field: 'rootId',
            message: 'Reply post must have a root ID',
          },
        ],
      });
    }

    if (parentId !== null && path === '1') {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Reply post path cannot be "1"',
        extensions: [
          {
            field: 'path',
            message: 'Reply post path cannot be "1"',
          },
        ],
      });
    }

    this._userId = props.userId;
    this._parentId = parentId;
    this._rootId = rootId;
    this._childCounter = props.childCounter ?? 0;
    this._path = path;
    this._message = props.message;
    this._attachmentFileId = props.attachmentFileId ?? null;
  }

  public get userId(): string {
    return this._userId;
  }

  public get parentId(): string | null {
    return this._parentId;
  }

  public get rootId(): string | null {
    return this._rootId;
  }

  public get childCounter(): number {
    return this._childCounter;
  }

  public get path(): string {
    return this._path;
  }

  public get message(): string {
    return this._message;
  }

  public get attachmentFileId(): string | null {
    return this._attachmentFileId;
  }

  public buildChildPath(nextChildNumber: number): string {
    if (!Number.isInteger(nextChildNumber) || nextChildNumber <= 0) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Next child number must be a positive integer',
        extensions: [
          {
            field: 'nextChildNumber',
            message: 'Next child number must be a positive integer',
          },
        ],
      });
    }

    return `${this._path}.${nextChildNumber}`;
  }

  public changeMessage(message: string): void {
    if (this._message === message) {
      return;
    }

    this._message = message;
    this.touch();
  }

  public setAttachment(attachmentFileId: string): void {
    if (this._attachmentFileId === attachmentFileId) {
      return;
    }

    this._attachmentFileId = attachmentFileId;
    this.touch();
  }

  public removeAttachment(): void {
    if (this._attachmentFileId === null) {
      return;
    }

    this._attachmentFileId = null;
    this.touch();
  }
}

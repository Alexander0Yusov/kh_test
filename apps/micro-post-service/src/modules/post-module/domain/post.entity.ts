import {
  BaseDomainEntity,
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';

export type PostEntityProps = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  homePage?: string | null;
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
  private readonly _userName: string;
  private readonly _email: string;
  private readonly _homePage: string | null;

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
    const email = props.email.trim().toLowerCase();
    const homePage = normalizeHomePage(props.homePage);

    if (!/^[A-Za-z0-9]+$/.test(props.userName)) {
      throw validationException('userName');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw validationException('email');
    }
    if (homePage !== null && !isHttpUrl(homePage)) {
      throw validationException('homePage');
    }

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
    this._userName = props.userName;
    this._email = email;
    this._homePage = homePage;
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

  public get userName(): string {
    return this._userName;
  }

  public get email(): string {
    return this._email;
  }

  public get homePage(): string | null {
    return this._homePage;
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

function normalizeHomePage(value?: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized.length === 0 ? null : normalized;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validationException(field: string): DomainException {
  return new DomainException({
    code: DomainExceptionCode.ValidationFailed,
    message: 'Validation failed.',
    extensions: [{ field, message: 'Validation failed.' }],
  });
}

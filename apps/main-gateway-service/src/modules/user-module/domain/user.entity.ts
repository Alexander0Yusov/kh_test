import { BaseDomainEntity } from '../../../../../../libs/common/src/domain/entities/base-domain.entity';

export type UserEntityProps = {
  id: string;
  email: string;
  passwordHash: string;
  avatarFileId: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export class UserEntity extends BaseDomainEntity {
  private _email: string;

  private _passwordHash: string;
  private readonly _avatarFileId: string;

  public constructor(props: UserEntityProps) {
    super(props);

    this._email = props.email;
    this._passwordHash = props.passwordHash;
    this._avatarFileId = props.avatarFileId;
  }

  public get email(): string {
    return this._email;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get avatarFileId(): string {
    return this._avatarFileId;
  }

  public changePasswordHash(passwordHash: string): void {
    if (this._passwordHash === passwordHash) {
      return;
    }

    this._passwordHash = passwordHash;
    this.touch();
  }
}

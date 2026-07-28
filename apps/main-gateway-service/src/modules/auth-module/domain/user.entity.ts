import { BaseDomainEntity } from '../../../../../../libs/common/src/domain/entities/base-domain.entity';

export type UserEntityProps = {
  id: string;
  email: string;
  userName: string;
  passwordHash: string;
  homePage: string;
  avatarFileId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export class UserEntity extends BaseDomainEntity {
  private _email: string;

  private _userName: string;

  private _passwordHash: string;

  private _homePage: string;

  private _avatarFileId: string | null;

  public constructor(props: UserEntityProps) {
    super(props);

    this._email = props.email;
    this._userName = props.userName;
    this._passwordHash = props.passwordHash;
    this._homePage = props.homePage;
    this._avatarFileId = props.avatarFileId;
  }

  public get email(): string {
    return this._email;
  }

  public get userName(): string {
    return this._userName;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get homePage(): string {
    return this._homePage;
  }

  public get avatarFileId(): string | null {
    return this._avatarFileId;
  }

  public changeUserName(userName: string): void {
    if (this._userName === userName) {
      return;
    }

    this._userName = userName;
    this.touch();
  }

  public changeHomePage(homePage: string): void {
    if (this._homePage === homePage) {
      return;
    }

    this._homePage = homePage;
    this.touch();
  }

  public changePasswordHash(passwordHash: string): void {
    if (this._passwordHash === passwordHash) {
      return;
    }

    this._passwordHash = passwordHash;
    this.touch();
  }

  public setAvatar(avatarFileId: string): void {
    if (this._avatarFileId === avatarFileId) {
      return;
    }

    this._avatarFileId = avatarFileId;
    this.touch();
  }

  public removeAvatar(): void {
    if (this._avatarFileId === null) {
      return;
    }

    this._avatarFileId = null;
    this.touch();
  }
}

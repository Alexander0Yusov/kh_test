import {
  BaseDomainEntity,
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';

export type SessionEntityProps = {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  ip: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export class SessionEntity extends BaseDomainEntity {
  private _userId: string;

  private _deviceId: string;

  private _deviceName: string;

  private _ip: string;

  private _issuedAt: Date;

  private _expiresAt: Date;

  private _revokedAt: Date | null;

  public constructor(props: SessionEntityProps) {
    if (props.issuedAt.getTime() >= props.expiresAt.getTime()) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: 'Session must expire after it is issued',
        extensions: [
          {
            field: 'expiresAt',
            message: 'Expiration time must be later than issue time',
          },
        ],
      });
    }

    super(props);

    this._userId = props.userId;
    this._deviceId = props.deviceId;
    this._deviceName = props.deviceName;
    this._ip = props.ip;
    this._issuedAt = new Date(props.issuedAt.getTime());
    this._expiresAt = new Date(props.expiresAt.getTime());
    this._revokedAt = props.revokedAt
      ? new Date(props.revokedAt.getTime())
      : null;
  }

  public get userId(): string {
    return this._userId;
  }

  public get deviceId(): string {
    return this._deviceId;
  }

  public get deviceName(): string {
    return this._deviceName;
  }

  public get ip(): string {
    return this._ip;
  }

  public get issuedAt(): Date {
    return new Date(this._issuedAt.getTime());
  }

  public get expiresAt(): Date {
    return new Date(this._expiresAt.getTime());
  }

  public get revokedAt(): Date | null {
    return this._revokedAt ? new Date(this._revokedAt.getTime()) : null;
  }

  public get isRevoked(): boolean {
    return this._revokedAt !== null;
  }

  public revoke(at: Date = new Date()): void {
    if (this._revokedAt !== null) {
      return;
    }

    this._revokedAt = new Date(at.getTime());
    this.touch(at);
  }

  public isExpired(at: Date = new Date()): boolean {
    return this._expiresAt.getTime() <= at.getTime();
  }

  public isActive(at: Date = new Date()): boolean {
    return !this.isRevoked && !this.isExpired(at) && !this.isDeleted;
  }
}

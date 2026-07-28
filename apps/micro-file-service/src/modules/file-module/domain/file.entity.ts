import {
  BaseDomainEntity,
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';
import { FileStatus } from './file-status.enum';

export type FileEntityProps = {
  id: string;
  s3Key: string;
  bucket: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
  status?: FileStatus;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export class FileEntity extends BaseDomainEntity {
  private readonly _s3Key: string;

  private readonly _bucket: string;

  private readonly _extension: string;

  private readonly _size: number;

  private readonly _width: number | null;

  private readonly _height: number | null;

  private _status: FileStatus;

  public constructor(props: FileEntityProps) {
    super(props);

    this._s3Key = props.s3Key;
    this._bucket = props.bucket;
    this._extension = props.extension;
    this._size = props.size;
    this._width = props.width;
    this._height = props.height;
    this._status = props.status ?? FileStatus.Pending;
  }

  public get s3Key(): string {
    return this._s3Key;
  }

  public get bucket(): string {
    return this._bucket;
  }

  public get extension(): string {
    return this._extension;
  }

  public get size(): number {
    return this._size;
  }

  public get width(): number | null {
    return this._width;
  }

  public get height(): number | null {
    return this._height;
  }

  public get status(): FileStatus {
    return this._status;
  }

  public markUploaded(): void {
    this.transitionTo(FileStatus.Uploaded, [FileStatus.Pending]);
  }

  public markUsed(): void {
    this.transitionTo(FileStatus.Used, [FileStatus.Uploaded]);
  }

  public markRejected(): void {
    this.transitionTo(FileStatus.Rejected, [
      FileStatus.Pending,
      FileStatus.Uploaded,
      FileStatus.Used,
    ]);
  }

  public markFailed(): void {
    this.transitionTo(FileStatus.Failed, [FileStatus.Pending]);
  }

  private transitionTo(
    targetStatus: FileStatus,
    allowedStatuses: FileStatus[],
  ): void {
    if (!allowedStatuses.includes(this._status)) {
      throw new DomainException({
        code: DomainExceptionCode.InvalidBusinessState,
        message: `File status cannot change from ${this._status} to ${targetStatus}`,
        extensions: [
          {
            field: 'status',
            message: `File status cannot change from ${this._status} to ${targetStatus}`,
          },
        ],
      });
    }

    this._status = targetStatus;
    this.touch();
  }
}

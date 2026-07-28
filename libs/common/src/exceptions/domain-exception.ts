import { DomainExceptionCode } from './domain-exception-code';

export interface DomainExceptionExtension {
  message: string;
  field: string;
}

export interface DomainExceptionOptions {
  code: DomainExceptionCode;
  message: string;
  extensions?: DomainExceptionExtension[];
}

export class DomainException extends Error {
  readonly code: DomainExceptionCode;

  readonly extensions: DomainExceptionExtension[];

  constructor(options: DomainExceptionOptions) {
    super(options.message);

    this.name = DomainException.name;
    this.code = options.code;
    this.extensions = options.extensions ?? [];
  }
}

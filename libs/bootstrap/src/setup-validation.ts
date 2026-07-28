import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import {
  DomainException,
  DomainExceptionCode,
} from '../../common/src/exceptions';

export function setupValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      exceptionFactory: (errors: ValidationError[]): never => {
        const firstError = errors[0];

        throw new DomainException({
          code: DomainExceptionCode.ValidationFailed,
          message: 'Validation failed.',
          extensions: firstError
            ? [
                {
                  field: firstError.property,
                  message: 'Validation failed.',
                },
              ]
            : [],
        });
      },
    }),
  );
}

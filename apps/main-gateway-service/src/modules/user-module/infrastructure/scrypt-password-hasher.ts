import { Injectable } from '@nestjs/common';
import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from '../application/contracts/password-hasher';

const scryptAsync = promisify(scrypt);
const SALT_SIZE = 16;
const KEY_LENGTH = 64;

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_SIZE).toString('hex');
    const hash = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt$${salt}$${hash.toString('hex')}`;
  }

  public async verify(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const [algorithm, salt, storedHash, ...extraParts] =
      passwordHash.split('$');

    if (
      algorithm !== 'scrypt' ||
      typeof salt !== 'string' ||
      typeof storedHash !== 'string' ||
      salt.length !== SALT_SIZE * 2 ||
      storedHash.length !== KEY_LENGTH * 2 ||
      extraParts.length > 0 ||
      !/^[0-9a-f]+$/i.test(salt) ||
      !/^[0-9a-f]+$/i.test(storedHash)
    ) {
      return false;
    }

    const expectedHash = Buffer.from(storedHash, 'hex');
    const actualHash = (await scryptAsync(
      password,
      salt,
      expectedHash.length,
    )) as Buffer;

    return timingSafeEqual(actualHash, expectedHash);
  }
}

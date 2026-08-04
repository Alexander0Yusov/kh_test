import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';
import { CoreConfig } from '../../../../../../libs/common/src/config/core-config';
import { GatewayConfig } from '../../../common/config/gateway-config';
import { RedisService } from '../../../common/redis/redis.module';
import {
  type CaptchaChallenge,
  CaptchaService,
} from '../application/queries/get-captcha.query';

const CAPTCHA_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 6;
const CAPTCHA_ID_ATTEMPTS = 3;
const REDIS_SCAN_COUNT = 100;

type StoredChallenge = {
  salt: string;
  hash: string;
};

@Injectable()
export class RedisCaptchaService extends CaptchaService {
  private readonly logger = new Logger(RedisCaptchaService.name);
  private readonly keyPrefix: string;

  public constructor(
    private readonly config: GatewayConfig,
    coreConfig: CoreConfig,
    private readonly redis: RedisService,
  ) {
    super();
    this.keyPrefix = `dzencode:${environmentKey(coreConfig.nodeEnv)}:captcha:`;
  }

  public async create(): Promise<CaptchaChallenge> {
    const answer = Array.from({ length: CAPTCHA_LENGTH }, () =>
      CAPTCHA_CHARACTERS.at(randomInt(CAPTCHA_CHARACTERS.length)),
    ).join('');
    const salt = randomBytes(16);
    const challenge: StoredChallenge = {
      salt: salt.toString('base64'),
      hash: scryptSync(answer, salt, 32).toString('base64'),
    };
    const value = JSON.stringify(challenge);

    for (let attempt = 0; attempt < CAPTCHA_ID_ATTEMPTS; attempt += 1) {
      const captchaId = randomUUID();
      const stored = await this.storeChallenge(captchaId, value);
      if (stored === 'OK') {
        return {
          captchaId,
          image: `data:image/png;base64,${(
            await sharp(Buffer.from(this.svg(answer)))
              .png()
              .toBuffer()
          ).toString('base64')}`,
        };
      }
    }

    throw new DomainException({
      code: DomainExceptionCode.ServiceUnavailable,
      message: 'CAPTCHA service is unavailable.',
    });
  }

  public async verifyAndConsume(
    captchaId: string,
    captchaValue: string,
  ): Promise<void> {
    const value = await this.consumeChallenge(captchaId);
    if (value === null) {
      throw invalidCaptchaException();
    }

    const challenge = parseStoredChallenge(value);
    if (challenge === null) {
      this.logger.warn('Removed malformed CAPTCHA challenge');
      throw invalidCaptchaException();
    }

    const actual = scryptSync(captchaValue.toUpperCase(), challenge.salt, 32);
    if (!timingSafeEqual(actual, challenge.hash)) {
      throw invalidCaptchaException();
    }
  }

  public async clearAll(): Promise<void> {
    try {
      for await (const keys of this.redis.client.scanIterator({
        MATCH: `${this.keyPrefix}*`,
        COUNT: REDIS_SCAN_COUNT,
      })) {
        if (keys.length > 0) {
          await this.redis.client.unlink(keys);
        }
      }
    } catch {
      throw redisUnavailableException();
    }
  }

  private async storeChallenge(
    captchaId: string,
    value: string,
  ): Promise<string | null> {
    try {
      return await this.redis.client.set(this.key(captchaId), value, {
        EX: this.config.captchaTtlSeconds,
        NX: true,
      });
    } catch {
      throw redisUnavailableException();
    }
  }

  private async consumeChallenge(captchaId: string): Promise<string | null> {
    try {
      return await this.redis.client.getDel(this.key(captchaId));
    } catch {
      throw redisUnavailableException();
    }
  }

  private key(captchaId: string): string {
    return `${this.keyPrefix}${captchaId}`;
  }

  private svg(answer: string): string {
    const characters = [...answer]
      .map(
        (character, index) =>
          `<text x="${18 + index * 25}" y="${42 + randomInt(-4, 5)}" transform="rotate(${randomInt(-15, 16)} ${18 + index * 25} 35)">${character}</text>`,
      )
      .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="175" height="60"><rect width="100%" height="100%" fill="#f4f4f4"/><g stroke="#7b7b7b" opacity=".45"><path d="M5 12L168 49M3 48L171 16M10 30L165 27"/></g><g font-family="DejaVu Sans Mono, monospace" font-size="30" font-weight="700" fill="#222">${characters}</g></svg>`;
  }
}

function environmentKey(nodeEnv: string): string {
  switch (nodeEnv) {
    case 'development':
      return 'dev';
    case 'testing':
      return 'test';
    case 'production':
      return 'prod';
    default:
      throw new Error(`Unsupported NODE_ENV value: ${nodeEnv}`);
  }
}

function parseStoredChallenge(value: string): {
  salt: Buffer;
  hash: Buffer;
} | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('salt' in parsed) ||
      !('hash' in parsed) ||
      typeof parsed.salt !== 'string' ||
      typeof parsed.hash !== 'string'
    ) {
      return null;
    }

    const salt = Buffer.from(parsed.salt, 'base64');
    const hash = Buffer.from(parsed.hash, 'base64');
    return salt.length === 16 && hash.length === 32 ? { salt, hash } : null;
  } catch {
    return null;
  }
}

function invalidCaptchaException(): DomainException {
  return new DomainException({
    code: DomainExceptionCode.InvalidCaptcha,
    message: 'Invalid CAPTCHA.',
    extensions: [{ field: 'captchaValue', message: 'Invalid CAPTCHA.' }],
  });
}

function redisUnavailableException(): DomainException {
  return new DomainException({
    code: DomainExceptionCode.ServiceUnavailable,
    message: 'CAPTCHA service is unavailable.',
  });
}

import {
  randomBytes,
  randomInt,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import {
  DomainException,
  DomainExceptionCode,
} from '../../../../../../libs/common/src';
import { GatewayConfig } from '../../../common/config/gateway-config';
import {
  type CaptchaChallenge,
  CaptchaService,
} from '../application/queries/get-captcha.query';

const CAPTCHA_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CAPTCHA_LENGTH = 6;
const CAPTCHA_CAPACITY = 1000;

type StoredChallenge = {
  salt: Buffer;
  hash: Buffer;
  expiresAt: number;
  createdAt: number;
};

@Injectable()
export class InMemoryCaptchaService extends CaptchaService {
  private readonly challenges = new Map<string, StoredChallenge>();

  public constructor(private readonly config: GatewayConfig) {
    super();
  }

  public async create(): Promise<CaptchaChallenge> {
    this.removeExpired();
    this.ensureCapacity();

    const captchaId = randomUUID();
    const answer = Array.from({ length: CAPTCHA_LENGTH }, () =>
      CAPTCHA_CHARACTERS.at(randomInt(CAPTCHA_CHARACTERS.length)),
    ).join('');
    const salt = randomBytes(16);
    const now = Date.now();
    this.challenges.set(captchaId, {
      salt,
      hash: scryptSync(answer, salt, 32),
      expiresAt: now + this.config.captchaTtlSeconds * 1000,
      createdAt: now,
    });

    return {
      captchaId,
      image: `data:image/png;base64,${(
        await sharp(Buffer.from(this.svg(answer)))
          .png()
          .toBuffer()
      ).toString('base64')}`,
    };
  }

  public verifyAndConsume(captchaId: string, captchaValue: string): void {
    const challenge = this.challenges.get(captchaId);
    this.challenges.delete(captchaId);

    if (challenge === undefined || challenge.expiresAt <= Date.now()) {
      throw invalidCaptchaException();
    }

    const actual = scryptSync(captchaValue.toUpperCase(), challenge.salt, 32);
    if (!timingSafeEqual(actual, challenge.hash)) {
      throw invalidCaptchaException();
    }
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [id, challenge] of this.challenges) {
      if (challenge.expiresAt <= now) {
        this.challenges.delete(id);
      }
    }
  }

  private ensureCapacity(): void {
    while (this.challenges.size >= CAPTCHA_CAPACITY) {
      const oldest = [...this.challenges.entries()].sort(
        ([, left], [, right]) => left.createdAt - right.createdAt,
      )[0];
      if (oldest === undefined) {
        return;
      }
      this.challenges.delete(oldest[0]);
    }
  }

  private svg(answer: string): string {
    const characters = [...answer]
      .map(
        (character, index) =>
          `<text x="${18 + index * 25}" y="${42 + randomInt(-4, 5)}" transform="rotate(${randomInt(-15, 16)} ${18 + index * 25} 35)">${character}</text>`,
      )
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="175" height="60"><rect width="100%" height="100%" fill="#f4f4f4"/><g stroke="#7b7b7b" opacity=".45"><path d="M5 12L168 49M3 48L171 16M10 30L165 27"/></g><g font-family="monospace" font-size="30" font-weight="700" fill="#222">${characters}</g></svg>`;
  }
}

function invalidCaptchaException(): DomainException {
  return new DomainException({
    code: DomainExceptionCode.InvalidCaptcha,
    message: 'Invalid CAPTCHA.',
    extensions: [{ field: 'captchaValue', message: 'Invalid CAPTCHA.' }],
  });
}

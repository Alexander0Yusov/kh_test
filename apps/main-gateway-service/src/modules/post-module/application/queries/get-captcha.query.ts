import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

export type CaptchaChallenge = {
  captchaId: string;
  image: string;
};

export abstract class CaptchaService {
  public abstract create(): Promise<CaptchaChallenge>;
  public abstract verifyAndConsume(
    captchaId: string,
    captchaValue: string,
  ): void;
}

export class GetCaptchaQuery {}

@QueryHandler(GetCaptchaQuery)
export class GetCaptchaHandler implements IQueryHandler<
  GetCaptchaQuery,
  CaptchaChallenge
> {
  public constructor(private readonly captchaService: CaptchaService) {}

  public execute(): Promise<CaptchaChallenge> {
    return this.captchaService.create();
  }
}

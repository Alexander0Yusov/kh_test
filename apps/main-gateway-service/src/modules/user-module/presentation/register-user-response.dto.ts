import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserResponseDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  public id!: string;

  @ApiProperty({ example: 'user@example.com', format: 'email' })
  public email!: string;

  @ApiProperty({ example: 'alex' })
  public userName!: string;

  @ApiProperty({ example: 'https://example.com/alex' })
  public homePage!: string;

  @ApiProperty({
    example: '00000000-0000-4000-8000-000000000001',
    format: 'uuid',
  })
  public avatarFileId!: string;

  @ApiProperty({
    example: '2026-07-28T12:00:00.000Z',
    format: 'date-time',
  })
  public createdAt!: Date;
}

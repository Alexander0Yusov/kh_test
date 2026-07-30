import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserResponseDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  public id!: string;

  @ApiProperty({ example: 'user@example.com', format: 'email' })
  public email!: string;

  @ApiProperty({
    example: '2026-07-28T12:00:00.000Z',
    format: 'date-time',
  })
  public createdAt!: Date;
}

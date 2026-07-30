import { ApiProperty } from '@nestjs/swagger';

export class GetCurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ format: 'email' })
  public email!: string;

  @ApiProperty({ format: 'uri' })
  public avatarUrl!: string;
}

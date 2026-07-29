import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    description: 'Unique user email address.',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  public email!: string;

  @ApiProperty({
    example: 'alex',
    description: 'Public user name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public userName!: string;

  @ApiProperty({
    example: 'secret-password',
    format: 'password',
    writeOnly: true,
    description: 'Plain password accepted only for registration.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  public password!: string;

  @ApiProperty({
    example: 'https://example.com/alex',
    description: 'User-provided home page value.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  public homePage!: string;

  @ApiProperty({
    example: '00000000-0000-4000-8000-000000000001',
    format: 'uuid',
    description:
      'Identifier of a previously uploaded avatar file verified during registration.',
  })
  @IsUUID()
  public avatarFileId!: string;
}

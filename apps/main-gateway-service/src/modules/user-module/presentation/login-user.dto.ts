import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
  @ApiProperty({
    example: 'user@example.com',
    format: 'email',
    description: 'Registered user email address.',
  })
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @ApiProperty({
    example: 'secret-password',
    format: 'password',
    writeOnly: true,
    description: 'User password.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  public password!: string;

  @ApiProperty({
    example: 'browser-device-id',
    description: 'Client-generated device identifier.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public deviceId!: string;

  @ApiProperty({
    example: 'Chrome on Windows',
    description: 'Human-readable device name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public deviceName!: string;
}

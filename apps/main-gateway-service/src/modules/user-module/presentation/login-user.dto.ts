import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  @IsNotEmpty()
  public email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  public password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public deviceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  public deviceName!: string;
}

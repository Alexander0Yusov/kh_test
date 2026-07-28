import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  public email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  public userName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  public password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  public homePage!: string;

  @IsUUID()
  public avatarFileId!: string;
}

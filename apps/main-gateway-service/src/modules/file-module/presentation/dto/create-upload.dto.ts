import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUploadDto {
  @ApiProperty({
    example: '.jpg',
    description: 'Declared file extension. Supported: .jpg, .png, .gif, .txt.',
  })
  @IsString()
  @IsNotEmpty()
  public fileExtension!: string;

  @ApiProperty({
    type: 'integer',
    example: 52428,
    minimum: 1,
    maximum: 102400,
    description:
      'Declared file size in bytes. The File Service is the runtime source of this limit.',
  })
  @IsInt()
  @IsPositive()
  public fileSize!: number;
}

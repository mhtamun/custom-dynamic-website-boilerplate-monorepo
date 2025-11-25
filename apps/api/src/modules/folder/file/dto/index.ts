import { PartialType } from '@nestjs/mapped-types';
import { FileType, GeneralStatus } from '@prisma/client';

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FileDto {
  @Type(() => Number)
  @IsNumber()
  @IsInt()
  @IsNotEmpty()
  folderId: number;

  @IsEnum(FileType)
  @IsOptional()
  type: FileType;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsEnum(GeneralStatus)
  @IsNotEmpty()
  status: GeneralStatus;
}

export class UpdateFileDto extends PartialType(FileDto) {}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialUsedDto {
  @IsString()
  @IsNotEmpty()
  material: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;
}

export class CreateProductionLogDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @Min(0)
  quantityProduced: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialUsedDto)
  materialsUsed?: MaterialUsedDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  worker?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED'])
  status?: string;
}

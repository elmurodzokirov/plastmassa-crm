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
  @IsNumber()
  @Min(0)
  costPerUnitProduced?: number;

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

  /** Internal use: shared identifier when this log is one line of a multi-product batch. */
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  machine?: string;

  @IsOptional()
  @IsEnum(['DAY', 'NIGHT'])
  shift?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursWorked?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityDefective?: number;
}

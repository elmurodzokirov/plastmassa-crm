import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SalesUnitDto {
  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0.001)
  conversionFactor: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @IsNumber()
  @Min(0.001)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pieceRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesUnitDto)
  salesUnits?: SalesUnitDto[];
}

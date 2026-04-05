import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SalesUnitDto {
  @IsString()
  @IsNotEmpty()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  conversionFactor: number;

  @Type(() => Number)
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

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  pieceRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesUnitDto)
  salesUnits?: SalesUnitDto[];
}

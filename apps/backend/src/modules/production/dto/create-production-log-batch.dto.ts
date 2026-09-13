import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionLogBatchItemDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsNumber()
  @Min(0.001)
  quantityProduced: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityDefective?: number;
}

export class CreateProductionLogBatchDto {
  @IsString()
  @IsNotEmpty()
  worker: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductionLogBatchItemDto)
  items: ProductionLogBatchItemDto[];
}

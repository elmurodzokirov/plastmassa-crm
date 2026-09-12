import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductionLogBatchItemDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsNumber()
  @Min(0.001)
  quantityProduced: number;
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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductionLogBatchItemDto)
  items: ProductionLogBatchItemDto[];
}

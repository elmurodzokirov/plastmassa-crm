import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductLotBatchItemDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsMongoId()
  @IsNotEmpty()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellPrice?: number;
}

export class CreateProductLotBatchDto {
  @IsMongoId()
  @IsOptional()
  supplier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsArray()
  @ArrayMinSize(1, { message: "Kamida bitta mahsulot qatori bo'lishi kerak" })
  @ValidateNested({ each: true })
  @Type(() => ProductLotBatchItemDto)
  items: ProductLotBatchItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

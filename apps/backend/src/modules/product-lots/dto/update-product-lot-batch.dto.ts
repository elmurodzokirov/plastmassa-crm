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

export class UpdateProductLotBatchItemDto {
  /** Existing lot's id — omit to add a new line to the invoice. */
  @IsMongoId()
  @IsOptional()
  _id?: string;

  /** Only used for new lines; ignored for existing ones (the product on an
   *  existing line can't be changed — remove is not supported yet). */
  @IsMongoId()
  @IsOptional()
  product?: string;

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

export class UpdateProductLotBatchDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  additionalPaidAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "Kamida bitta mahsulot qatori bo'lishi kerak" })
  @ValidateNested({ each: true })
  @Type(() => UpdateProductLotBatchItemDto)
  items: UpdateProductLotBatchItemDto[];
}

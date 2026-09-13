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

export class UpdateProductionLogBatchItemDto {
  /** Present for an existing line being kept/edited; absent for a newly added line. */
  @IsOptional()
  @IsString()
  _id?: string;

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

export class UpdateProductionLogBatchDto {
  @IsOptional()
  @IsString()
  worker?: string;

  @IsOptional()
  @IsString()
  date?: string;

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
  @Type(() => UpdateProductionLogBatchItemDto)
  items: UpdateProductionLogBatchItemDto[];
}

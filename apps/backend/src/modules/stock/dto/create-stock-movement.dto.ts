import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';

export class CreateStockMovementDto {
  @IsEnum(['IN', 'OUT', 'ADJUSTMENT'])
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  product?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  referenceModel?: string;
}

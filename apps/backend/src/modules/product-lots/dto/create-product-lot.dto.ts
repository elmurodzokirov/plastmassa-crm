import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsMongoId, IsIn } from 'class-validator';

export class CreateProductLotDto {
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsMongoId()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsString()
  @IsOptional()
  @IsIn(['PURCHASE', 'PRODUCTION'])
  source?: 'PURCHASE' | 'PRODUCTION';

  @IsMongoId()
  @IsOptional()
  supplier?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

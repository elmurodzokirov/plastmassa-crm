import { IsString, IsNotEmpty, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'TRANSFER', 'CARD'])
  type: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

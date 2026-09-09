import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QuerySupplierReconciliationDto {
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

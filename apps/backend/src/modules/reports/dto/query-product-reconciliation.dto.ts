import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class QueryProductReconciliationDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

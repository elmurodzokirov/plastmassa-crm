import { IsOptional, IsString } from 'class-validator';

export class QueryProductionReportDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

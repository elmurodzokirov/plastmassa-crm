import { IsOptional, IsString, IsEnum } from 'class-validator';

export class QueryReturnDto {
  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED'])
  status?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

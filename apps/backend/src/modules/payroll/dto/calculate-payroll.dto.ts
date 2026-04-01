import { IsNumber, Min, Max, IsOptional, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CalculatePayrollDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsNumber()
  year: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalary?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

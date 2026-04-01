import { IsNumber, Min, Max, IsArray, ValidateNested, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkPayrollItemDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkCalculatePayrollDto {
  @IsNumber()
  year: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPayrollItemDto)
  items: BulkPayrollItemDto[];
}

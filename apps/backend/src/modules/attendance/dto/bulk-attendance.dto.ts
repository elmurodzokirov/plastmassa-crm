import {
  IsArray,
  ValidateNested,
  IsDateString,
  IsNotEmpty,
  IsMongoId,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkAttendanceItemDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'])
  @IsNotEmpty()
  status: string;

  @IsNumber()
  @Min(0)
  @Max(24)
  @IsOptional()
  hoursWorked?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overtimeHours?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkAttendanceDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  records: BulkAttendanceItemDto[];
}

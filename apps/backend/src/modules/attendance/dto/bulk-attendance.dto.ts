import { IsArray, ValidateNested, IsDateString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkAttendanceItemDto {
  @IsNotEmpty()
  user: string;

  @IsNotEmpty()
  status: string;

  hoursWorked?: number;
  overtimeHours?: number;
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

import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsOptional, IsDateString, IsMongoId } from 'class-validator';

export class CreateAttendanceDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'])
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

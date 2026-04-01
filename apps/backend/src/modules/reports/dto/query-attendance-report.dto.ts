import { IsOptional, IsString } from 'class-validator';

export class QueryAttendanceReportDto {
  @IsOptional()
  @IsString()
  year?: string;

  @IsOptional()
  @IsString()
  month?: string;
}

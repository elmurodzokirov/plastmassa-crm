import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdatePayrollStatusDto {
  @IsEnum(['CONFIRMED', 'PAID'])
  @IsNotEmpty()
  status: string;
}

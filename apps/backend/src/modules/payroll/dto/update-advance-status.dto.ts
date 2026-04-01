import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateAdvanceStatusDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  status: string;
}

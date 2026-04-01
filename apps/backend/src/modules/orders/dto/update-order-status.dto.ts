import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['PENDING', 'CONFIRMED', 'CANCELLED'])
  status: string;
}

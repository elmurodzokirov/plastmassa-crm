import { IsNumber, IsNotEmpty } from 'class-validator';

export class SetSupplierBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

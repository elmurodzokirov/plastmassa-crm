import { IsNumber, IsNotEmpty } from 'class-validator';

export class SetCustomerBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

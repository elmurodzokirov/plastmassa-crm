import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  CASH_ACCOUNTS,
  CASH_IN_KINDS,
  CASH_OUT_KINDS,
} from '../schemas/cash-operation.schema';

export class CreateCashOperationDto {
  @IsEnum([...CASH_IN_KINDS, ...CASH_OUT_KINDS])
  @IsNotEmpty()
  kind: string;

  @IsEnum([...CASH_ACCOUNTS])
  account: string;

  @IsNumber()
  @Min(0.01, { message: "Summa 0 dan katta bo'lishi kerak" })
  amount: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsIn,
} from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsMongoId()
  @IsOptional()
  paidBy?: string;

  @IsString()
  @IsIn(['cash', 'bank', 'card'])
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsString()
  @IsOptional()
  order?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['CASH', 'TRANSFER', 'CARD'])
  type: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

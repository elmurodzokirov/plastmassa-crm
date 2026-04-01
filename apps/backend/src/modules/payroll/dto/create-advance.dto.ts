import { IsMongoId, IsNotEmpty, IsNumber, Min, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAdvanceDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

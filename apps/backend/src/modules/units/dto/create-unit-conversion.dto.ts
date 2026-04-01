import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateUnitConversionDto {
  @IsString()
  @IsNotEmpty()
  fromUnit: string;

  @IsString()
  @IsNotEmpty()
  toUnit: string;

  @IsNumber()
  @IsPositive()
  factor: number;
}

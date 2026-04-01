import { IsNotEmpty, IsString, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceItemDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsNumber()
  @Min(0)
  price: number;
}

export class BulkUpsertCustomerPriceDto {
  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceItemDto)
  prices: PriceItemDto[];
}

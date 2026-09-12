import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  // Required for order-independent returns (no matching order line to copy the
  // price from). Ignored when `order` is set — the price is copied from that
  // order's own line item, same as before.
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class CreateReturnDto {
  // Optional — when omitted, `customer` must be provided and items are taken
  // as-is from the request (a "return from customer" not tied to one order).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  order?: string;

  // Required when `order` is omitted.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customer?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

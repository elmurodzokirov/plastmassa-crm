import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeliverOrderDto {
  @IsString()
  @IsNotEmpty()
  deliveredTo: string;

  @IsString()
  @IsOptional()
  deliveryNotes?: string;
}

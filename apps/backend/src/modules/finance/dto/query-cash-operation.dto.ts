import { IsEnum, IsOptional } from 'class-validator';

export class QueryCashOperationDto {
  @IsOptional()
  @IsEnum(['IN', 'OUT'])
  direction?: string;
}

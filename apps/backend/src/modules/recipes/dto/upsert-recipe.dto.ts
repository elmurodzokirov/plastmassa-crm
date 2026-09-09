import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsString()
  @IsNotEmpty()
  material: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantityPerUnit: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  wastagePercent?: number;
}

export class UpsertRecipeDto {
  @IsString()
  @IsNotEmpty()
  product: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Kamida bitta xom-ashyo qo\'shilishi kerak' })
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborCostPerUnit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overheadPercent?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

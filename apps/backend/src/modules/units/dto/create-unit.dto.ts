import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { UnitTypeEnum } from '../schemas/unit.schema';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsEnum(UnitTypeEnum)
  @IsNotEmpty()
  type: UnitTypeEnum;
}

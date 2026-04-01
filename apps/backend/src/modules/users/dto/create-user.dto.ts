import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsMongoId,
  IsIn,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsMongoId()
  @IsNotEmpty()
  role: string;

  @IsIn(['FIXED', 'PIECE_RATE'])
  @IsOptional()
  salaryType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseSalary?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  inactiveReason?: string;
}

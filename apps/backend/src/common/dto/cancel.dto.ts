import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelDto {
  @IsString()
  @IsNotEmpty({ message: 'Bekor qilish sababini kiriting' })
  @MaxLength(500)
  reason: string;
}

import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  // Faqat foydalanuvchida parol allaqachon mavjud bo'lsa talab qilinadi
  // (AuthService.changePassword ichida tekshiriladi). Telegram OTP orqali
  // kirib, birinchi marta parol o'rnatayotgan foydalanuvchi uchun bu
  // maydon bo'sh qoldirilishi mumkin.
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(6, { message: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak" })
  newPassword: string;
}

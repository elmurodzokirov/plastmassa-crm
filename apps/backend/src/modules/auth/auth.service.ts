import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetupSuperAdminDto } from './dto/setup-super-admin.dto';
import { UserDocument } from '../users/schemas/user.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Otp.name) private readonly otpModel: Model<OtpDocument>,
    private readonly telegramService: TelegramService,
  ) {}

  async getSetupStatus() {
    const count = await this.usersService.count();
    return { needsSetup: count === 0 };
  }

  async setupSuperAdmin(dto: SetupSuperAdminDto) {
    const existingCount = await this.usersService.count();
    if (existingCount > 0) {
      throw new ConflictException(
        "Tizimda allaqachon foydalanuvchilar mavjud, birinchi o'rnatish faqat bo'sh tizimda ishlaydi",
      );
    }

    let directorRole = await this.rolesService.findByName('Direktor');
    if (!directorRole) {
      // Fallback: eng ko'p ruxsatga ega mavjud rolni olamiz
      const roles = await this.rolesService.findAll();
      directorRole = roles.sort((a, b) => b.permissions.length - a.permissions.length)[0];
    }
    if (!directorRole) {
      throw new BadRequestException(
        "Rol topilmadi. Avval kamida bitta rol (masalan 'Direktor') mavjud bo'lishi kerak",
      );
    }

    const user = await this.usersService.create({
      fullName: dto.fullName,
      username: dto.username,
      password: dto.password,
      phone: dto.phone,
      role: directorRole._id.toString(),
      salaryType: 'FIXED',
    });

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.formatUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.password) {
      throw new UnauthorizedException('Password login not available for this user');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.formatUser(user),
    };
  }

  async sendOtp(dto: SendOtpDto) {
    const user = await this.usersService.findByPhone(dto.phone);

    if (!user) {
      throw new NotFoundException('Bu telefon raqam tizimda topilmadi');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Hisob faol emas');
    }

    if (!user.telegramChatId) {
      throw new BadRequestException(
        'Avval Telegram botga /start yuboring va telefon raqamingizni ulang',
      );
    }

    // Invalidate old OTPs
    await this.otpModel.updateMany(
      { phone: dto.phone, isUsed: false },
      { $set: { isUsed: true } },
    );

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES') || 5;

    await this.otpModel.create({
      phone: dto.phone,
      code,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      attempts: 0,
      isUsed: false,
    });

    await this.telegramService.sendOtp(user.telegramChatId, code);

    return { message: 'OTP yuborildi', expiresIn: expiryMinutes * 60 };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS') || 3;

    const otp = await this.otpModel
      .findOne({
        phone: dto.phone,
        isUsed: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: maxAttempts },
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!otp) {
      throw new UnauthorizedException('OTP topilmadi yoki muddati tugagan');
    }

    if (otp.code !== dto.code) {
      otp.attempts += 1;
      await otp.save();
      throw new UnauthorizedException('Noto\'g\'ri kod');
    }

    otp.isUsed = true;
    await otp.save();

    const user = await this.usersService.findByPhone(dto.phone);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    user.lastActiveAt = new Date();
    await user.save();

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.formatUser(user),
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async generateTokens(user: UserDocument) {
    // Always re-populate role to ensure permissions are available
    await user.populate('role');
    const role = user.role as any;
    const permissions: string[] = role?.permissions || [];
    const roleName: string = role?.name || '';

    const payload = {
      sub: user._id.toString(),
      phone: user.phone,
      permissions,
      roleName,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async validateUser(payload: { sub: string }) {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      return null;
    }

    const role = user.role as any;
    const permissions: string[] = role?.permissions || [];

    return {
      _id: user._id.toString(),
      fullName: user.fullName,
      username: user.username,
      phone: user.phone,
      role: user.role,
      salaryType: user.salaryType,
      isActive: user.isActive,
      permissions,
    };
  }

  private formatUser(user: UserDocument) {
    const userObj = user.toJSON();
    return {
      _id: user._id.toString(),
      fullName: userObj.fullName,
      username: userObj.username,
      phone: userObj.phone,
      role: userObj.role,
      salaryType: userObj.salaryType,
      isActive: userObj.isActive,
      createdAt: userObj.createdAt,
      updatedAt: userObj.updatedAt,
    };
  }
}

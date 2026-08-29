import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { UsersService } from '../users/users.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Telegraf | null = null;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot disabled');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.start((ctx) => {
      ctx.reply(
        "Sardoba Ko'za Plast CRM botiga xush kelibsiz!\n\n" +
        'Telefon raqamingizni ulash uchun quyidagi tugmani bosing:',
        {
          reply_markup: {
            keyboard: [
              [{ text: 'Telefon raqamni yuborish', request_contact: true }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    });

    this.bot.on('contact', async (ctx) => {
      const contact = ctx.message.contact;

      if (contact.user_id !== ctx.from.id) {
        ctx.reply('Faqat o\'z telefon raqamingizni yuborishingiz mumkin.');
        return;
      }

      let phone = contact.phone_number;
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }

      try {
        await this.usersService.linkTelegram(phone, ctx.chat.id.toString());
        ctx.reply(
          'Telefon raqamingiz muvaffaqiyatli ulandi!\n' +
          'Endi CRM tizimiga kirish uchun OTP kodlarni shu yerdan olasiz.',
          { reply_markup: { remove_keyboard: true } },
        );
      } catch {
        ctx.reply(
          'Bu telefon raqam tizimda topilmadi. Administrator bilan bog\'laning.',
          { reply_markup: { remove_keyboard: true } },
        );
      }
    });

    this.bot
      .launch()
      .then(() => this.logger.log('Telegram bot started'))
      .catch((err) => this.logger.error('Failed to start Telegram bot', err));
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('Application shutdown');
    }
  }

  async sendOtp(chatId: string, code: string): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Telegram bot not initialized, OTP not sent');
      return;
    }

    await this.bot.telegram.sendMessage(
      chatId,
      `Sardoba Ko'za Plast CRM tasdiqlash kodingiz: *${code}*\n\nKod 5 daqiqa ichida amal qiladi.`,
      { parse_mode: 'Markdown' },
    );
  }
}

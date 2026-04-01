import { Global, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

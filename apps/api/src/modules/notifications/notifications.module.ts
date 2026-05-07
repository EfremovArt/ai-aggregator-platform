import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailAdapter } from './adapters/email.adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailAdapter, TelegramAdapter],
  exports: [NotificationsService, EmailAdapter, TelegramAdapter],
})
export class NotificationsModule {}

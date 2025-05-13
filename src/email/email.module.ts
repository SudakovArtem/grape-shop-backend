import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EmailService } from './email.service'
import { MailerModule } from '@nestjs-modules/mailer'
import { getMailConfig } from '../configs/mail.config'

@Global() // Делаем глобальным, чтобы сервис был доступен везде
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getMailConfig
    })
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}

import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EmailService } from './email.service'

@Global() // Делаем глобальным, чтобы сервис был доступен везде
@Module({
  imports: [ConfigModule], // EmailService использует ConfigService
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}

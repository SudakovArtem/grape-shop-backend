import { Module } from '@nestjs/common'
// ConfigModule уже импортирован глобально в AppModule
import { PaymentController } from './payment.controller'
import { YouKassaService } from './youkassa.service'

@Module({
  imports: [
    // ConfigModule убираем, так как он уже глобальный
  ],
  controllers: [PaymentController],
  providers: [YouKassaService],
  exports: [YouKassaService] // Экспортируем сервис, если он будет использоваться в других модулях
})
export class PaymentModule {}

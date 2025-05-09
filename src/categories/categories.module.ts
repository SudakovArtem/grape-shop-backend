import { Module } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { CategoriesController } from './categories.controller'

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService]
  // DrizzleModule или DRIZZLE_PROVIDER_TOKEN должны быть доступны, т.к. сервис его использует.
  // Если DrizzleModule глобальный или экспортирует провайдер токена глобально, то здесь ничего не нужно.
  // В нашем случае AppModule предоставляет DRIZZLE_PROVIDER_TOKEN глобально.
})
export class CategoriesModule {}

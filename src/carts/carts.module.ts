import { Module } from '@nestjs/common'
import { CartsController } from './carts.controller'
import { CartsService } from './carts.service'
import { LogsModule } from '../logs/logs.module'
import { CommonModule } from '../common/common.module'
import { FavoritesModule } from '../favorites/favorites.module'

@Module({
  imports: [LogsModule, CommonModule, FavoritesModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService]
})
export class CartsModule {}

import { Module } from '@nestjs/common'
import { CartsController } from './carts.controller'
import { CartsService } from './carts.service'
import { LogsModule } from '../logs/logs.module'
import { CommonModule } from '../common/common.module'

@Module({
  imports: [LogsModule, CommonModule],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService]
})
export class CartsModule {}

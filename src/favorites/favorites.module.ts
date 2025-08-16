import { Module } from '@nestjs/common'
import { FavoritesController } from './favorites.controller'
import { FavoritesService } from './favorites.service'
import { DbModule } from '../db/db.module'
import { LogsModule } from '../logs/logs.module'

@Module({
  imports: [DbModule, LogsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService]
})
export class FavoritesModule {}

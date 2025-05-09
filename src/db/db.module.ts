import { Global, Module } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from './constants'
import { db } from './index'

@Global() // Делаем DbModule глобальным, чтобы DRIZZLE_PROVIDER_TOKEN был доступен везде
@Module({
  providers: [
    {
      provide: DRIZZLE_PROVIDER_TOKEN,
      useValue: db
    }
  ],
  exports: [DRIZZLE_PROVIDER_TOKEN]
})
export class DbModule {}

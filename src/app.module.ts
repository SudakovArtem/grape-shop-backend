import { Module } from '@nestjs/common'
import { UsersModule } from './users/users.module'
import { ConfigModule } from '@nestjs/config'
import { ProductsModule } from './products/products.module'
import { CartsModule } from './carts/carts.module'
import { OrdersModule } from './orders/orders.module'
import { LogsModule } from './logs/logs.module'
import { AwsModule } from './aws/aws.module'
import { UploadsModule } from './uploads/uploads.module'
import { CategoriesModule } from './categories/categories.module'
import { EmailModule } from './email/email.module'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { DbModule } from './db/db.module'
import { ArticlesModule } from './articles/articles.module'
import { ArticleCategoriesModule } from './article-categories/article-categories.module'
import { PaymentModule } from './payment/payment.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 60
      }
    ]),
    UsersModule,
    ProductsModule,
    CartsModule,
    OrdersModule,
    LogsModule,
    AwsModule,
    CategoriesModule,
    EmailModule,
    UploadsModule,
    DbModule,
    ArticlesModule,
    ArticleCategoriesModule,
    PaymentModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useValue: ThrottlerGuard
    }
  ]
})
export class AppModule {}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { YooCheckout, Payment } from '@a2seven/yoo-checkout'
import { ICreatePayment } from '@a2seven/yoo-checkout'
import { YooKassaNotificationDto, PaymentObjectDto } from './dto'
import { db } from '../db'
import { payments } from '../db/schema'
import { eq } from 'drizzle-orm'

@Injectable()
export class YouKassaService implements OnModuleInit {
  private yooKassa: YooCheckout
  private readonly logger = new Logger(YouKassaService.name)
  private shopId: string
  private secretKey: string

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const shopIdFromEnv = this.configService.get<string>('YOUKASSA_SHOP_ID')
    const secretKeyFromEnv = this.configService.get<string>('YOUKASSA_SECRET_KEY')

    if (!shopIdFromEnv || !secretKeyFromEnv) {
      this.logger.error('YOUKASSA_SHOP_ID или YOUKASSA_SECRET_KEY не установлены в переменных окружения!')
      throw new Error('YooKassa credentials are not configured.')
    }

    this.shopId = shopIdFromEnv
    this.secretKey = secretKeyFromEnv

    this.yooKassa = new YooCheckout({
      shopId: this.shopId,
      secretKey: this.secretKey
    })
    this.logger.log('YooKassa Service Initialized')
  }

  async createPayment(paymentDetails: ICreatePayment, idempotenceKey: string): Promise<Payment> {
    try {
      const payment = await this.yooKassa.createPayment(paymentDetails, idempotenceKey)

      // Сохраняем информацию о платеже в базу данных
      const metadata = paymentDetails.metadata as Record<string, string> | undefined
      await db.insert(payments).values({
        yookassaPaymentId: payment.id,
        orderId: metadata?.orderId ? parseInt(metadata.orderId) : null,
        userId: parseInt(metadata?.userId || '0'),
        amount: payment.amount.value,
        currency: payment.amount.currency,
        status: payment.status,
        paid: payment.paid,
        description: payment.description,
        confirmationUrl: payment.confirmation?.confirmation_url,
        metadata: JSON.stringify(payment.metadata || {}),
        test: payment.test
      })

      this.logger.log(`Payment created: ${payment.id}, status: ${payment.status}`)
      return payment
    } catch (error) {
      this.logger.error('Error creating payment with YooKassa:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to create payment with YooKassa: ${errorMessage}`)
    }
  }

  async handleNotification(notification: YooKassaNotificationDto) {
    const paymentObject = notification.object
    this.logger.log(`Received YooKassa Notification: event=${notification.event}, payment_id=${paymentObject?.id}`)

    if (paymentObject && paymentObject.id) {
      try {
        // Обновляем платеж в базе данных
        await db
          .update(payments)
          .set({
            status: paymentObject.status,
            paid: paymentObject.paid,
            metadata: JSON.stringify(paymentObject.metadata || {}),
            updatedAt: new Date()
          })
          .where(eq(payments.yookassaPaymentId, paymentObject.id))

        this.logger.log(`Payment ${paymentObject.id} updated by notification: status=${paymentObject.status}`)

        // Здесь должна быть логика обновления статуса заказа в вашей основной БД
        // Например, если notification.event === 'payment.succeeded', то помечаем заказ как оплаченный.
        // Также можно эмитить событие NestJS, на которое подпишется другой сервис (например, OrdersService)
      } catch (error) {
        this.logger.error(`Failed to update payment ${paymentObject.id}:`, error)
      }
    } else {
      this.logger.warn('Received notification without payment ID or object:', notification)
    }
    return { status: 'success' }
  }

  async getPaymentInfo(paymentId: string): Promise<PaymentObjectDto | null> {
    try {
      const paymentRecord = await db.select().from(payments).where(eq(payments.yookassaPaymentId, paymentId)).limit(1)

      if (paymentRecord.length === 0) {
        this.logger.warn(`Payment info for ${paymentId} not found in database.`)
        return null
      }

      const payment = paymentRecord[0]

      // Преобразуем данные из БД в PaymentObjectDto
      return {
        id: payment.yookassaPaymentId,
        status: payment.status,
        paid: payment.paid,
        amount: {
          value: payment.amount,
          currency: payment.currency
        },
        created_at: payment.createdAt!.toISOString(),
        description: payment.description,
        confirmation: payment.confirmationUrl
          ? {
              type: 'redirect',
              confirmation_url: payment.confirmationUrl
            }
          : undefined,
        metadata: payment.metadata ? (JSON.parse(payment.metadata) as Record<string, any>) : undefined,
        test: payment.test
      } as PaymentObjectDto
    } catch (error) {
      this.logger.error(`Error fetching payment info for ${paymentId}:`, error)
      return null
    }
  }
}

import { Controller, Post, Body, Get, Param, HttpCode, HttpStatus, Logger, HttpException } from '@nestjs/common'
import { YouKassaService } from './youkassa.service'
import { CreatePaymentRequestDto, CreatePaymentResponseDto, YooKassaNotificationDto, PaymentObjectDto } from './dto'
import { ConfigService } from '@nestjs/config'
import { ICreatePayment } from '@a2seven/yoo-checkout'

@Controller('payment') // Базовый путь для этого контроллера будет /payment
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name)
  private returnUrl: string

  constructor(
    private readonly youKassaService: YouKassaService,
    private readonly configService: ConfigService
  ) {
    // Проверяем, что configService доступен
    if (!this.configService) {
      this.returnUrl = 'https://example.com/return' // Фейковый URL для генерации Swagger
      return
    }

    const returnUrlFromEnv = this.configService.get<string>('YOUKASSA_RETURN_URL')
    if (!returnUrlFromEnv) {
      this.logger.error('YOUKASSA_RETURN_URL не установлен в переменных окружения!')
      throw new Error('YooKassa return URL is not configured.')
    }
    this.returnUrl = returnUrlFromEnv
  }

  @Post('create')
  @HttpCode(HttpStatus.OK) // По умолчанию POST возвращает 201, но здесь мы возвращаем данные о платеже сразу
  async createPayment(@Body() body: CreatePaymentRequestDto): Promise<CreatePaymentResponseDto> {
    this.logger.log(`Create payment request received: ${JSON.stringify(body)}`)
    const { value, orderId, userId } = body

    if (!value || !orderId || !userId) {
      this.logger.warn('Create payment: Missing required fields')
      throw new HttpException('Missing required fields: value, orderId, userId', HttpStatus.BAD_REQUEST)
    }

    const createPayload: ICreatePayment = {
      amount: {
        value: value,
        currency: 'RUB'
      },
      payment_method_data: {
        type: 'bank_card'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: this.returnUrl
      },
      metadata: {
        orderId: orderId,
        userId: userId
      },
      description: `Оплата заказа ${orderId} для пользователя ${userId}`
    }

    try {
      const idempotenceKey = `${orderId}-${Date.now()}`
      const payment = await this.youKassaService.createPayment(createPayload, idempotenceKey)
      this.logger.log(`Payment creation successful for orderId: ${orderId}, paymentId: ${payment.id}`)
      return { payment }
    } catch (error) {
      this.logger.error(`Failed to create payment for orderId: ${orderId}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment'
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post('notifications')
  @HttpCode(HttpStatus.OK)
  async handleNotification(@Body() notification: YooKassaNotificationDto) {
    const paymentObject = notification.object
    this.logger.log(`Received notification: event=${notification.event}, payment_id=${paymentObject?.id}`)
    // TODO: Добавить проверку IP-адреса отправителя (см. документацию YooKassa)
    // Это важно для безопасности, чтобы убедиться, что уведомления приходят от YooKassa
    try {
      return await this.youKassaService.handleNotification(notification)
    } catch (error) {
      this.logger.error('Error processing notification:', error)
      // YooKassa будет повторять уведомление, если не получит 200 OK.
      // Важно не выбрасывать здесь ошибку, которая приведет к ответу != 200,
      // а логировать и разбираться, почему обработка не удалась.
      // Если ошибка критическая и обработка невозможна, можно ответить ошибкой,
      // но это приведет к повторным попыткам от YooKassa.
      // Возвращаем успешный ответ, чтобы YooKassa не повторяла, но логируем проблему.
      return { status: 'error_processing' } // Или просто { status: 'success' } и положиться на логи
    }
  }

  @Get('status/:paymentId')
  async getPaymentStatus(@Param('paymentId') paymentId: string): Promise<PaymentObjectDto | null> {
    this.logger.log(`Get payment status request for paymentId: ${paymentId}`)
    if (!paymentId) {
      this.logger.warn('Get payment status: Payment ID is required')
      throw new HttpException('Payment ID is required', HttpStatus.BAD_REQUEST)
    }

    try {
      const paymentInfo = await this.youKassaService.getPaymentInfo(paymentId)
      if (!paymentInfo) {
        this.logger.warn(`Payment not found for paymentId: ${paymentId}`)
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND)
      }
      return paymentInfo
    } catch (error) {
      this.logger.error(`Error fetching status for paymentId: ${paymentId}:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to get payment status'
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}

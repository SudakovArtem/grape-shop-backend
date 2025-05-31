import { ApiProperty } from '@nestjs/swagger'

export class PaymentAmountDto {
  @ApiProperty({ example: '1000.00', description: 'Сумма платежа' })
  value: string

  @ApiProperty({ example: 'RUB', description: 'Валюта платежа' })
  currency: string
}

export class PaymentConfirmationDto {
  @ApiProperty({ example: 'redirect', description: 'Тип подтверждения' })
  type: string

  @ApiProperty({
    example: 'https://yoomoney.ru/checkout/payments/v2/contract/123',
    description: 'URL для подтверждения платежа'
  })
  confirmation_url?: string

  @ApiProperty({ example: 'https://example.com/return', description: 'URL возврата' })
  return_url?: string
}

export class PaymentObjectDto {
  @ApiProperty({ example: 'payment-id-123', description: 'Идентификатор платежа' })
  id: string

  @ApiProperty({
    example: 'succeeded',
    description: 'Статус платежа',
    enum: ['pending', 'waiting_for_capture', 'succeeded', 'canceled']
  })
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'

  @ApiProperty({ example: false, description: 'Флаг оплаченного платежа' })
  paid: boolean

  @ApiProperty({ type: PaymentAmountDto, description: 'Сумма платежа' })
  amount: PaymentAmountDto

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Время создания платежа' })
  created_at: string

  @ApiProperty({ example: 'Оплата заказа №123', description: 'Описание платежа' })
  description?: string

  @ApiProperty({ type: PaymentConfirmationDto, description: 'Данные для подтверждения платежа' })
  confirmation?: PaymentConfirmationDto

  @ApiProperty({ example: { orderId: 'order-123', userId: 'user-456' }, description: 'Метаданные платежа' })
  metadata?: Record<string, any>

  @ApiProperty({ example: true, description: 'Тестовый платеж' })
  test: boolean
}

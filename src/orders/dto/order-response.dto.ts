import { ApiProperty } from '@nestjs/swagger'
import { OrderItemResponseDto } from './order-item-response.dto'
import { OrderSystemStatus } from './order-status.enum'

export class OrderResponseDto {
  @ApiProperty({ description: 'ID заказа', type: Number })
  id: number

  @ApiProperty({ description: 'ID пользователя, оформившего заказ', type: Number })
  userId: number

  @ApiProperty({ description: 'Общая стоимость заказа (строка)', type: String, example: '300.50' })
  totalPrice: string // Decimal из БД представляется как строка

  @ApiProperty({
    description: 'Текущий статус заказа',
    enum: OrderSystemStatus,
    example: OrderSystemStatus.CREATED
  })
  status: OrderSystemStatus

  @ApiProperty({ description: 'Дата и время создания заказа', type: Date, nullable: true })
  createdAt: Date | null

  @ApiProperty({
    type: () => [OrderItemResponseDto],
    description: 'Список позиций в заказе'
  })
  items: OrderItemResponseDto[]
}

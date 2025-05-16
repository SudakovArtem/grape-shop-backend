import { ApiProperty } from '@nestjs/swagger'

export class OrderItemResponseDto {
  @ApiProperty({ description: 'ID позиции в заказе', type: Number })
  id: number

  @ApiProperty({ description: 'ID заказа, к которому относится позиция', type: Number })
  orderId: number

  @ApiProperty({ description: 'ID заказанного продукта', type: Number })
  productId: number

  @ApiProperty({ description: 'Тип товара (черенок или саженец)', enum: ['cutting', 'seedling'] })
  type: 'cutting' | 'seedling'

  @ApiProperty({ description: 'Количество товара в данной позиции', type: Number })
  quantity: number

  @ApiProperty({ description: 'Цена за единицу товара на момент заказа (строка)', type: String, example: '150.00' })
  price: string // Decimal из БД представляется как строка
}

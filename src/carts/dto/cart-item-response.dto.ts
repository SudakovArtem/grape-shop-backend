import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// Базовый CartItem, соответствующий carts.$inferSelect
export class BaseCartItemDto {
  @ApiProperty({ description: 'ID элемента корзины', type: Number })
  id: number

  @ApiProperty({ description: 'ID пользователя', type: Number })
  userId: number

  @ApiProperty({ description: 'ID продукта', type: Number })
  productId: number

  @ApiProperty({ description: 'Тип товара (черенок или саженец)', enum: ['cutting', 'seedling'] })
  type: 'cutting' | 'seedling'

  @ApiProperty({ description: 'Количество товара', type: Number })
  quantity: number

  // createdAt и updatedAt могут быть добавлены, если они есть в carts.$inferSelect и возвращаются сервисом
  // @ApiProperty({ description: 'Дата добавления', type: Date })
  // createdAt: Date;
}

// Расширенный CartItem с деталями продукта
export class CartItemResponseDto extends BaseCartItemDto {
  @ApiPropertyOptional({ description: 'Название продукта', type: String, nullable: true })
  productName: string | null

  @ApiProperty({ description: 'Цена за единицу товара (черенок или саженец)', type: Number })
  unitPrice: number

  @ApiProperty({ description: 'Общая стоимость данного товара (quantity * unitPrice)', type: Number })
  itemTotalPrice: number

  @ApiPropertyOptional({ description: 'URL основного изображения продукта', type: String, nullable: true })
  imageUrl?: string | null
}

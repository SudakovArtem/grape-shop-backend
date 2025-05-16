import { ApiProperty } from '@nestjs/swagger'
import { CartItemResponseDto } from './cart-item-response.dto'

export class CartDetailsResponseDto {
  @ApiProperty({ type: [CartItemResponseDto], isArray: true, description: 'Список товаров в корзине' })
  items: CartItemResponseDto[]

  @ApiProperty({ description: 'Общая стоимость всех товаров в корзине', type: Number })
  totalCartPrice: number
}

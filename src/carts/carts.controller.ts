import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Put,
  Param,
  ParseIntPipe,
  Delete
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation } from '@nestjs/swagger'
import { CartsService } from './carts.service'
import { AuthGuard } from '@nestjs/passport'
import { AddItemToCartDto } from './dto/add-item-to-cart.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'
import { BaseCartItemDto } from './dto/cart-item-response.dto'
import { CartDetailsResponseDto } from './dto/cart-details-response.dto'

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавить товар в корзину или обновить количество существующего' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Товар успешно добавлен/обновлен в корзине.',
    type: CartDetailsResponseDto
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для добавления/обновления товара.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт не найден.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async addItem(@Request() req: { user: { id: number } }, @Body() addItemToCartDto: AddItemToCartDto): Promise<CartDetailsResponseDto> {
    const userId = req.user.id
    return this.cartsService.addItem(userId, addItemToCartDto)
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить содержимое корзины пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Содержимое корзины.', type: CartDetailsResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async getCart(@Request() req: { user: { id: number } }) {
    const userId = req.user.id
    return this.cartsService.getCart(userId)
  }

  @Put(':itemId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить количество конкретного товара в корзине' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Количество товара успешно обновлено.', type: BaseCartItemDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные данные для обновления (например, quantity < 1).'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Элемент корзины не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка изменить чужой элемент корзины.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async updateItemQuantity(
    @Request() req: { user: { id: number } },
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    const userId = req.user.id
    return this.cartsService.updateItemQuantity(userId, itemId, updateCartItemDto.quantity)
  }

  @Delete(':itemId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить товар из корзины' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Корзина после удаления товара.', type: CartDetailsResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Элемент корзины не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка удалить чужой элемент корзины.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async removeItem(
    @Request() req: { user: { id: number } },
    @Param('itemId', ParseIntPipe) itemId: number
  ): Promise<CartDetailsResponseDto> {
    const userId = req.user.id
    return this.cartsService.removeItem(userId, itemId)
  }
}

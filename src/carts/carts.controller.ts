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
import { ApiTags, ApiBearerAuth, ApiResponse, ApiOperation, ApiHeader } from '@nestjs/swagger'
import { CartsService } from './carts.service'
import { FavoritesService } from '../favorites/favorites.service'
import { AuthGuard } from '@nestjs/passport'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'
import { AddItemToCartDto } from './dto/add-item-to-cart.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'
import { BaseCartItemDto } from './dto/cart-item-response.dto'
import { CartDetailsResponseDto } from './dto/cart-details-response.dto'
import { UserOrGuest } from '../common/decorators/user-or-guest.decorator'
import { UserOrGuestInterface } from '../common/interfaces/user-or-guest.interface'

@ApiTags('Cart')
@Controller('cart')
export class CartsController {
  constructor(
    private readonly cartsService: CartsService,
    private readonly favoritesService: FavoritesService
  ) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Добавить товар в корзину или обновить количество существующего' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии (обязательно для неавторизованных пользователей)',
    required: false
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Товар успешно добавлен/обновлен в корзине.',
    type: CartDetailsResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные данные для добавления/обновления товара или отсутствует авторизация/guest-id.'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт не найден.' })
  async addItem(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Body() addItemToCartDto: AddItemToCartDto
  ): Promise<CartDetailsResponseDto> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null
    return this.cartsService.addItem(userId, guestId, addItemToCartDto) as Promise<CartDetailsResponseDto>
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить содержимое корзины пользователя/гостя' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии (обязательно для неавторизованных пользователей)',
    required: false
  })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Содержимое корзины.', type: CartDetailsResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Отсутствует авторизация или guest-id.' })
  async getCart(@UserOrGuest() userOrGuest: UserOrGuestInterface) {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null
    return this.cartsService.getCart(userId, guestId) as Promise<CartDetailsResponseDto>
  }

  @Put(':itemId')
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить количество конкретного товара в корзине' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии (обязательно для неавторизованных пользователей)',
    required: false
  })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Количество товара успешно обновлено.', type: BaseCartItemDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Неверные данные для обновления (например, quantity < 1) или отсутствует авторизация/guest-id.'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Элемент корзины не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка изменить чужой элемент корзины.' })
  async updateItemQuantity(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null
    return this.cartsService.updateItemQuantity(userId, guestId, itemId, updateCartItemDto.quantity)
  }

  @Delete(':itemId')
  @UseGuards(OptionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить товар из корзины' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии (обязательно для неавторизованных пользователей)',
    required: false
  })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Корзина после удаления товара.', type: CartDetailsResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Элемент корзины не найден.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка удалить чужой элемент корзины.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Отсутствует авторизация или guest-id.' })
  async removeItem(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Param('itemId', ParseIntPipe) itemId: number
  ): Promise<CartDetailsResponseDto> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null
    return this.cartsService.removeItem(userId, guestId, itemId) as Promise<CartDetailsResponseDto>
  }

  @Post('migrate-guest-cart')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Перенести корзину гостя авторизованному пользователю' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии для переноса',
    required: true
  })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.OK, description: 'Корзина успешно перенесена.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Отсутствует guest-id.' })
  async migrateGuestCart(@Request() req: { user: { id: number } }, @UserOrGuest() userOrGuest: UserOrGuestInterface) {
    const userId = req.user.id
    const guestId = userOrGuest.guestId

    if (!guestId) {
      throw new Error('Guest ID is required for migration')
    }

    // Переносим корзину
    await this.cartsService.migrateGuestCartToUser(guestId, userId)

    // Переносим избранное
    await this.favoritesService.migrateGuestFavoritesToUser(guestId, userId)

    return { message: 'Корзина и избранное успешно перенесены' }
  }

  @Post('migrate-guest-data')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Перенести корзину и заказы гостя по email авторизованному пользователю' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Данные гостя успешно перенесены.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        migratedCart: { type: 'boolean' },
        migratedFavorites: { type: 'boolean' },
        linkedOrders: { type: 'number' }
      }
    }
  })
  async migrateGuestData(
    @Request() req: { user: { id: number; email: string } },
    @UserOrGuest() userOrGuest: UserOrGuestInterface
  ) {
    const userId = req.user.id
    const guestId = userOrGuest.guestId

    const result = {
      message: 'Миграция данных завершена',
      migratedCart: false,
      migratedFavorites: false,
      linkedOrders: 0
    }

    // Переносим корзину и избранное если есть guest-id
    if (guestId) {
      await this.cartsService.migrateGuestCartToUser(guestId, userId)
      result.migratedCart = true

      await this.favoritesService.migrateGuestFavoritesToUser(guestId, userId)
      result.migratedFavorites = true
    }

    // Связываем заказы по email (требует импорта OrdersService)
    // Пока оставим TODO - нужно избежать циклических зависимостей
    // result.linkedOrders = await this.ordersService.linkGuestOrdersToUser(userId, userEmail)

    return result
  }
}

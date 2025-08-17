import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiHeader } from '@nestjs/swagger'
import { FavoritesService } from './favorites.service'
import { AddToFavoritesDto, FavoriteResponseDto, PaginatedFavoriteResponseDto, FindAllFavoritesQueryDto } from './dto'
import { UserOrGuest } from '../common/decorators/user-or-guest.decorator'
import { UserOrGuestInterface } from '../common/interfaces/user-or-guest.interface'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'
import { MessageResponseDto } from '../common/dto/message-response.dto'

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(OptionalAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить продукт в избранное' })
  @ApiResponse({
    status: 201,
    description: 'Продукт успешно добавлен в избранное',
    type: FavoriteResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные данные'
  })
  @ApiResponse({
    status: 404,
    description: 'Продукт не найден'
  })
  @ApiResponse({
    status: 409,
    description: 'Продукт уже в избранном'
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-guest-id',
    description: 'ID гостя (для неавторизованных пользователей)',
    required: false
  })
  async addToFavorites(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Body() addToFavoritesDto: AddToFavoritesDto
  ): Promise<FavoriteResponseDto> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null

    return this.favoritesService.addToFavorites(userId, guestId, addToFavoritesDto)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список избранных продуктов' })
  @ApiResponse({
    status: 200,
    description: 'Список избранных продуктов',
    type: PaginatedFavoriteResponseDto
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректные параметры запроса'
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-guest-id',
    description: 'ID гостя (для неавторизованных пользователей)',
    required: false
  })
  async getFavorites(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Query() query: FindAllFavoritesQueryDto
  ): Promise<PaginatedFavoriteResponseDto> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null

    return this.favoritesService.getFavorites(userId, guestId, query)
  }

  @Get(':productId/check')
  @ApiOperation({ summary: 'Проверить, находится ли продукт в избранном' })
  @ApiParam({
    name: 'productId',
    description: 'ID продукта',
    type: Number
  })
  @ApiResponse({
    status: 200,
    description: 'Статус продукта в избранном',
    schema: {
      type: 'object',
      properties: {
        isFavorite: { type: 'boolean' }
      }
    }
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-guest-id',
    description: 'ID гостя (для неавторизованных пользователей)',
    required: false
  })
  async checkFavorite(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<{ isFavorite: boolean }> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null

    const isFavorite = await this.favoritesService.isFavorite(userId, guestId, productId)
    return { isFavorite }
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить продукт из избранного' })
  @ApiParam({
    name: 'productId',
    description: 'ID продукта для удаления из избранного',
    type: Number
  })
  @ApiResponse({
    status: 200,
    description: 'Продукт успешно удален из избранного',
    type: MessageResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Продукт не найден в избранном'
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-guest-id',
    description: 'ID гостя (для неавторизованных пользователей)',
    required: false
  })
  async removeFromFavorites(
    @UserOrGuest() userOrGuest: UserOrGuestInterface,
    @Param('productId', ParseIntPipe) productId: number
  ): Promise<MessageResponseDto> {
    const userId = userOrGuest.user?.id || null
    const guestId = userOrGuest.guestId || null

    await this.favoritesService.removeFromFavorites(userId, guestId, productId)
    return { message: 'Продукт успешно удален из избранного' }
  }
}

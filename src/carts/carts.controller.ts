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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CartsService } from './carts.service'
import { AuthGuard } from '@nestjs/passport'
import { AddItemToCartDto } from './dto/add-item-to-cart.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async addItem(@Request() req: { user: { id: number } }, @Body() addItemToCartDto: AddItemToCartDto) {
    const userId = req.user.id
    return this.cartsService.addItem(userId, addItemToCartDto)
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getCart(@Request() req: { user: { id: number } }) {
    const userId = req.user.id
    return this.cartsService.getCart(userId)
  }

  @Put(':itemId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Request() req: { user: { id: number } },
    @Param('itemId', ParseIntPipe) itemId: number
  ): Promise<void> {
    const userId = req.user.id
    await this.cartsService.removeItem(userId, itemId)
  }
}

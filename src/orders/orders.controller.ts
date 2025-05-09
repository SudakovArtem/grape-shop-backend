import {
  Controller,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  ParseIntPipe,
  Patch
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { AuthGuard } from '@nestjs/passport'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать новый заказ из корзины пользователя' })
  async createOrder(@Request() req: { user: { id: number } }) {
    const userId = req.user.id
    // Метод сервиса createOrder сам возьмет данные из корзины
    return await this.ordersService.createOrder(userId)
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить список заказов текущего пользователя' })
  async getOrders(@Request() req: { user: { id: number } }) {
    const userId = req.user.id
    return await this.ordersService.getOrders(userId)
  }

  @Get(':orderId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получить детали заказа по ID (для текущего пользователя)' })
  @ApiParam({ name: 'orderId', description: 'ID заказа', type: Number })
  async getOrderById(@Request() req: { user: { id: number } }, @Param('orderId', ParseIntPipe) orderId: number) {
    const userId = req.user.id
    return await this.ordersService.getOrderById(orderId, userId)
  }

  @Patch(':orderId/cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Отменить заказ (пользователем)' })
  @ApiParam({ name: 'orderId', description: 'ID заказа', type: Number })
  async cancelOrder(@Request() req: { user: { id: number } }, @Param('orderId', ParseIntPipe) orderId: number) {
    const userId = req.user.id
    return await this.ordersService.cancelOrder(orderId, userId)
  }

  // Здесь будут другие методы (getOrders)
}

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
  Query
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { AuthGuard } from '@nestjs/passport'
import { AuthenticatedUser } from '../users/jwt.strategy'
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto'
import { FindAllOrdersQueryDto } from './dto/find-all-orders-query.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { OrderResponseDto } from './dto/order-response.dto'
import { PaginatedOrderResponseDto } from './dto/paginated-order-response.dto'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('all')
  @ApiOperation({ summary: 'Получить все заказы (только для администраторов)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех заказов с пагинацией.',
    type: PaginatedOrderResponseDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllOrders(@Query() queryDto: FindAllOrdersQueryDto): Promise<PaginatedOrderResponseDto> {
    return this.ordersService.findAllOrders(queryDto)
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый заказ из корзины текущего пользователя' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Заказ успешно создан.', type: OrderResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Корзина пуста или ошибка при создании заказа.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Request() req: { user: AuthenticatedUser }): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(req.user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список заказов текущего пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список заказов пользователя с пагинацией.',
    type: PaginatedOrderResponseDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async getOrders(
    @Request() req: { user: AuthenticatedUser },
    @Query() queryDto: FindMyOrdersQueryDto
  ): Promise<PaginatedOrderResponseDto> {
    return this.ordersService.getOrders(req.user.id, queryDto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить детали конкретного заказа' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Детали заказа.', type: OrderResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден или не принадлежит пользователю (если не админ).'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка доступа к чужому заказу (не админ).' })
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, req.user)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить заказ' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Заказ успешно отменен.', type: OrderResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден или не принадлежит пользователю (если не админ).'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Заказ не может быть отменен (например, из-за статуса).'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Попытка отменить чужой заказ (не админ).' })
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, req.user)
  }

  // Здесь будут другие методы (getOrders)
}

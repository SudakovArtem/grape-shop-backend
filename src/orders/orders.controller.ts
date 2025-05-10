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
import { OrdersService, OrderWithItems, PaginatedOrdersResponse } from './orders.service'
import { AuthGuard } from '@nestjs/passport'
import { AuthenticatedUser } from '../users/jwt.strategy'
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto'
import { FindAllOrdersQueryDto } from './dto/find-all-orders-query.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('all')
  @ApiOperation({ summary: 'Получить все заказы (только для администраторов)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Список всех заказов с пагинацией.', type: Object })
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllOrders(@Query() queryDto: FindAllOrdersQueryDto): Promise<PaginatedOrdersResponse> {
    return this.ordersService.findAllOrders(queryDto)
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый заказ из корзины текущего пользователя' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Заказ успешно создан.', type: Object })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Request() req: { user: AuthenticatedUser }): Promise<OrderWithItems> {
    return this.ordersService.createOrder(req.user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список заказов текущего пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Список заказов пользователя с пагинацией.', type: Object })
  async getOrders(
    @Request() req: { user: AuthenticatedUser },
    @Query() queryDto: FindMyOrdersQueryDto
  ): Promise<PaginatedOrdersResponse> {
    return this.ordersService.getOrders(req.user.id, queryDto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить детали конкретного заказа текущего пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Детали заказа.', type: Object })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Заказ не найден или не принадлежит пользователю.' })
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<OrderWithItems> {
    return this.ordersService.getOrderById(id, req.user)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отменить заказ текущего пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Заказ успешно отменен.', type: Object })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Заказ не найден или не принадлежит пользователю.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Заказ не может быть отменен (например, из-за статуса).'
  })
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: AuthenticatedUser }
  ): Promise<OrderWithItems> {
    return this.ordersService.cancelOrder(id, req.user)
  }

  // Здесь будут другие методы (getOrders)
}

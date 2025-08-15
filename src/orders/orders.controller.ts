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
  Query,
  Body,
  BadRequestException
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { AuthGuard } from '@nestjs/passport'
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard'
import { AuthenticatedUser } from '../users/jwt.strategy'
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto'
import { FindAllOrdersQueryDto } from './dto/find-all-orders-query.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { OrderResponseDto } from './dto/order-response.dto'
import { PaginatedOrderResponseDto } from './dto/paginated-order-response.dto'
// import { CreateGuestOrderDto } from './dto/create-guest-order.dto'
// import { GuestId } from '../common/decorators/guest-id.decorator'

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все заказы (только для администраторов)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех заказов с пагинацией.',
    type: PaginatedOrderResponseDto
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async getAllOrders(@Query() queryDto: FindAllOrdersQueryDto): Promise<PaginatedOrderResponseDto> {
    return this.ordersService.findAllOrders(queryDto)
  }

  @Post()
  @UseGuards(OptionalAuthGuard) // Используем опциональную авторизацию
  @ApiOperation({ summary: 'Создать новый заказ из корзины (для авторизованных пользователей и гостей)' })
  @ApiHeader({
    name: 'X-Guest-Id',
    description: 'ID гостевой сессии (обязательно для неавторизованных пользователей)',
    required: false
  })
  @ApiBearerAuth()
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Заказ успешно создан.', type: OrderResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Корзина пуста, отсутствует авторизация/guest-id или неверные данные.'
  })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Request() req: any, @Body() body?: any): Promise<OrderResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const user = req.user
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const guestId = req.headers['x-guest-id']

    if (user) {
      // Авторизованный пользователь
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      return this.ordersService.createOrder(user.id)
    } else if (guestId) {
      // Гостевой пользователь - требуем email
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!body?.email) {
        throw new BadRequestException('Email обязателен для гостевых заказов')
      }

      const guestData = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: body.name || undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        phone: body.phone || undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        address: body.address || undefined
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      return this.ordersService.createGuestOrder(guestId, body.email, guestData)
    } else {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
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
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
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
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
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

  @Post('link-guest-orders')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Связать гостевые заказы с текущим пользователем по email' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Заказы успешно связаны.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        linkedOrdersCount: { type: 'number' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  async linkGuestOrders(@Request() req: { user: AuthenticatedUser }) {
    const userId = req.user.id
    const userEmail = req.user.email

    const linkedCount = await this.ordersService.linkGuestOrdersToUser(userId, userEmail)

    return {
      message: `Связано заказов: ${linkedCount}`,
      linkedOrdersCount: linkedCount
    }
  }
}

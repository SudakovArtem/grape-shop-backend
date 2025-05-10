import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { carts, products, orders, orderItems, users } from '../db/schema' // Импортируем нужные схемы
import { eq, inArray, and, count, desc, asc, SQL } from 'drizzle-orm' // Добавлен and, убран дубль inArray, добавлен count, desc, asc, SQL
import { alias } from 'drizzle-orm/pg-core'
import { NodePgDatabase } from 'drizzle-orm/node-postgres' // Импортируем тип для транзакции
import * as schema from '../db/schema' // Импортируем все схемы для транзакции
import { LogsService } from '../logs/logs.service' // Импорт LogsService
import { EmailService } from '../email/email.service' // Импорт EmailService
import { FindMyOrdersQueryDto } from './dto/find-my-orders-query.dto' // Импортируем DTO
import { FindAllOrdersQueryDto } from './dto/find-all-orders-query.dto' // Импортируем новый DTO
import { AuthenticatedUser } from '../users/jwt.strategy' // Импортируем AuthenticatedUser

// Определяем тип DrizzleDB с указанием схемы для транзакций
export type DrizzleDB = NodePgDatabase<typeof schema>

// Определяем типы для возвращаемых значений
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export interface OrderWithItems extends Order {
  items: OrderItem[]
}

// Тип для ответа с пагинацией
export interface PaginatedOrdersResponse {
  data: OrderWithItems[]
  meta: {
    total: number
    page: number
    limit: number
    lastPage: number
  }
}

@Injectable()
export class OrdersService {
  constructor(
    // Указываем правильный тип для drizzle, чтобы были доступны транзакции
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly logsService: LogsService, // Инъекция LogsService
    private readonly emailService: EmailService // Инъекция EmailService
  ) {}

  async createOrder(userId: number): Promise<OrderWithItems> {
    // Выполняем все операции внутри транзакции
    return this.drizzle.transaction(async (tx) => {
      // 1. Получить товары из корзины пользователя
      const p = alias(products, 'p')
      const userCartItems = await tx
        .select({
          cartId: carts.id,
          productId: carts.productId,
          type: carts.type,
          quantity: carts.quantity,
          cuttingPrice: p.cuttingPrice,
          seedlingPrice: p.seedlingPrice
        })
        .from(carts)
        .leftJoin(p, eq(carts.productId, p.id))
        .where(eq(carts.userId, userId))

      if (userCartItems.length === 0) {
        throw new BadRequestException('Корзина пуста')
      }

      // --- Получаем email пользователя ---
      const userInfo = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)

      if (userInfo.length === 0 || !userInfo[0].email) {
        // Это маловероятно, если userId валидный, но лучше обработать
        console.error(`Не удалось найти email для пользователя с ID: ${userId} при создании заказа.`)
        // Можно выбросить ошибку или продолжить без отправки email
        throw new Error('Не удалось получить email пользователя для отправки подтверждения заказа.')
      }
      const userEmail = userInfo[0].email
      // ---------------------------------

      // 2. Рассчитать общую стоимость и подготовить позиции заказа
      let totalOrderPrice = 0
      const orderItemsToInsert: (typeof orderItems.$inferInsert)[] = []

      for (const item of userCartItems) {
        const unitPriceDecimal = item.type === 'cutting' ? item.cuttingPrice : item.seedlingPrice
        if (unitPriceDecimal === null || unitPriceDecimal === undefined) {
          // Дополнительная проверка на случай, если цена изменилась пока товар был в корзине
          throw new BadRequestException(`Цена для продукта ID ${item.productId} типа "${item.type}" не найдена.`)
        }
        const unitPrice = parseFloat(unitPriceDecimal)
        const itemTotalPrice = item.quantity * unitPrice
        totalOrderPrice += itemTotalPrice

        orderItemsToInsert.push({
          orderId: 0, // Временный ID, будет заменен после создания заказа
          productId: item.productId,
          type: item.type,
          quantity: item.quantity,
          price: String(unitPrice) // Сохраняем цену как строку (decimal)
        })
      }

      // 3. Создать заказ в таблице orders
      const newOrder = await tx
        .insert(orders)
        .values({
          userId,
          totalPrice: String(totalOrderPrice),
          status: 'Создан' // Начальный статус
        })
        .returning()

      if (!newOrder || newOrder.length === 0) {
        throw new Error('Не удалось создать заказ')
      }
      const orderId = newOrder[0].id
      const orderStatus = newOrder[0].status

      // 4. Обновить orderId в подготовленных позициях заказа
      const finalOrderItems = orderItemsToInsert.map((item) => ({
        ...item,
        orderId: orderId
      }))

      // 5. Создать записи в order_items
      const insertedItems = await tx.insert(orderItems).values(finalOrderItems).returning()

      if (insertedItems.length !== finalOrderItems.length) {
        // Проверка, что все позиции были успешно вставлены
        throw new Error('Не удалось сохранить все позиции заказа')
      }

      // 6. Очистить корзину пользователя
      await tx.delete(carts).where(eq(carts.userId, userId))

      // Логируем создание заказа
      await this.logsService.createLog('order_created', userId)

      // --- Отправляем email подтверждение ---
      try {
        await this.emailService.sendOrderStatusUpdateEmail(userEmail, orderId, orderStatus)
      } catch (error) {
        console.error(`Ошибка при отправке email о создании заказа ${orderId} пользователю ${userEmail}:`, error)
      }
      // -------------------------------------

      // 7. Вернуть созданный заказ с позициями
      return { ...newOrder[0], items: insertedItems }
    })
  }

  async getOrders(userId: number, queryDto: FindMyOrdersQueryDto): Promise<PaginatedOrdersResponse> {
    const { page = 1, limit = 10, status, sortBy = '-createdAt' } = queryDto
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(orders.userId, userId)]
    if (status) {
      conditions.push(eq(orders.status, status))
    }

    const whereCondition = and(...conditions)

    let orderByClause = desc(orders.createdAt) // Сортировка по умолчанию
    if (sortBy === 'createdAt') {
      orderByClause = asc(orders.createdAt)
    } else if (sortBy === '-createdAt') {
      orderByClause = desc(orders.createdAt)
    }

    // 1. Получить заказы пользователя для текущей страницы с учетом фильтров и сортировки
    const userOrders = await this.drizzle
      .select()
      .from(orders)
      .where(whereCondition) // Используем объединенные условия
      .orderBy(orderByClause) // Используем клаузу сортировки
      .limit(limit)
      .offset(offset)

    if (userOrders.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, lastPage: 1 }
      }
    }

    const orderIds = userOrders.map((order) => order.id)

    const allOrderItems = await this.drizzle.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))

    const itemsByOrderId = allOrderItems.reduce(
      (acc, item) => {
        if (!acc[item.orderId]) {
          acc[item.orderId] = []
        }
        acc[item.orderId].push(item)
        return acc
      },
      {} as Record<number, OrderItem[]>
    )

    const ordersWithItems: OrderWithItems[] = userOrders.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || []
    }))

    // 2. Получить общее количество заказов пользователя для метаданных (с учетом фильтра по статусу)
    const totalResult = await this.drizzle
      .select({ count: count(orders.id) })
      .from(orders)
      .where(whereCondition) // Используем те же условия для подсчета

    const total = totalResult[0].count

    return {
      data: ordersWithItems,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    }
  }

  async getOrderById(orderId: number, currentUser: AuthenticatedUser): Promise<OrderWithItems> {
    // Сначала просто ищем заказ по ID
    const orderArray = await this.drizzle.select().from(orders).where(eq(orders.id, orderId)).limit(1)

    if (orderArray.length === 0) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден.`)
    }
    const order = orderArray[0]

    // Проверка прав доступа
    if (currentUser.role !== 'admin' && order.userId !== currentUser.id) {
      throw new ForbiddenException('У вас нет прав для просмотра этого заказа.')
    }

    const items = await this.drizzle.select().from(orderItems).where(eq(orderItems.orderId, orderId))

    return { ...order, items }
  }

  async cancelOrder(orderId: number, currentUser: AuthenticatedUser): Promise<OrderWithItems> {
    return this.drizzle.transaction(async (tx) => {
      // При отмене заказа, права проверяются строже: только владелец заказа
      // (или админ, если такая логика будет добавлена сюда позже, сейчас только владелец)
      const orderToCancelArray = await tx
        .select()
        .from(orders)
        // .where(and(eq(orders.id, orderId), eq(orders.userId, userId))) // Старая проверка
        .where(eq(orders.id, orderId)) // Сначала находим заказ
        .limit(1)

      if (orderToCancelArray.length === 0) {
        throw new NotFoundException(`Заказ с ID ${orderId} не найден.`)
      }
      const orderToCancel = orderToCancelArray[0]

      // Проверка прав: только владелец может отменить свой заказ
      // Если админ должен иметь возможность отменять любые заказы, эту логику нужно будет расширить
      if (orderToCancel.userId !== currentUser.id) {
        // Если и админ может отменять, то условие будет: if (currentUser.role !== 'admin' && orderToCancel.userId !== currentUser.id)
        throw new ForbiddenException('Вы можете отменить только свои заказы.')
      }

      if (['Отправлен', 'Доставлен'].includes(orderToCancel.status)) {
        throw new BadRequestException(`Заказ в статусе "${orderToCancel.status}" не может быть отменен.`)
      }

      if (orderToCancel.status === 'Отменен') {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderToCancel.id))
        return { ...orderToCancel, items }
      }

      const updatedOrderArray = await tx
        .update(orders)
        .set({ status: 'Отменен' })
        .where(eq(orders.id, orderId))
        .returning()

      if (updatedOrderArray.length === 0) {
        throw new Error('Не удалось отменить заказ.')
      }
      const updatedOrder = updatedOrderArray[0]

      const userInfo = await tx.select({ email: users.email }).from(users).where(eq(users.id, currentUser.id)).limit(1)
      if (userInfo.length > 0 && userInfo[0].email) {
        try {
          await this.emailService.sendOrderStatusUpdateEmail(userInfo[0].email, updatedOrder.id, updatedOrder.status)
        } catch (error) {
          console.error(
            `Ошибка при отправке email об отмене заказа ${updatedOrder.id} пользователю ${userInfo[0].email}:`,
            error
          )
        }
      }
      await this.logsService.createLog('order_cancelled', currentUser.id)
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, updatedOrder.id))
      return { ...updatedOrder, items }
    })
  }

  async findAllOrders(queryDto: FindAllOrdersQueryDto): Promise<PaginatedOrdersResponse> {
    const { page = 1, limit = 10, userId, status, sortBy = '-createdAt' } = queryDto
    const offset = (page - 1) * limit

    const conditions: SQL[] = [] // Начинаем с пустого массива условий

    if (userId) {
      conditions.push(eq(orders.userId, userId))
    }
    if (status) {
      conditions.push(eq(orders.status, status))
    }

    // Если conditions пустой, whereCondition будет undefined, что Drizzle обработает как отсутствие WHERE
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined

    let orderByClause = desc(orders.createdAt) // Сортировка по умолчанию
    if (sortBy === 'createdAt') {
      orderByClause = asc(orders.createdAt)
    } else if (sortBy === '-createdAt') {
      orderByClause = desc(orders.createdAt)
    }

    const allOrdersResults = await this.drizzle
      .select()
      .from(orders)
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    if (allOrdersResults.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, lastPage: 1 }
      }
    }

    const orderIds = allOrdersResults.map((order) => order.id)

    const allOrderItems = await this.drizzle.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))

    const itemsByOrderId = allOrderItems.reduce(
      (acc, item) => {
        if (!acc[item.orderId]) {
          acc[item.orderId] = []
        }
        acc[item.orderId].push(item)
        return acc
      },
      {} as Record<number, OrderItem[]>
    )

    const ordersWithItems: OrderWithItems[] = allOrdersResults.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || []
    }))

    const totalResult = await this.drizzle
      .select({ count: count(orders.id) })
      .from(orders)
      .where(whereCondition)

    const total = totalResult[0].count

    return {
      data: ordersWithItems,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    }
  }
}

import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { carts, products, orders, orderItems, users } from '../db/schema' // Импортируем нужные схемы
import { eq, inArray, and } from 'drizzle-orm' // Добавлен and, убран дубль inArray
import { alias } from 'drizzle-orm/pg-core'
import { NodePgDatabase } from 'drizzle-orm/node-postgres' // Импортируем тип для транзакции
import * as schema from '../db/schema' // Импортируем все схемы для транзакции
import { LogsService } from '../logs/logs.service' // Импорт LogsService
import { EmailService } from '../email/email.service' // Импорт EmailService

// Определяем тип DrizzleDB с указанием схемы для транзакций
export type DrizzleDB = NodePgDatabase<typeof schema>

// Определяем типы для возвращаемых значений
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export interface OrderWithItems extends Order {
  items: OrderItem[]
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

  async getOrders(userId: number): Promise<OrderWithItems[]> {
    // 1. Получить все заказы пользователя
    const userOrders = await this.drizzle.select().from(orders).where(eq(orders.userId, userId))
    // Можно добавить сортировку по дате создания
    // .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return [] // Если заказов нет, возвращаем пустой массив
    }

    // 2. Получить ID всех заказов
    const orderIds = userOrders.map((order) => order.id)

    // 3. Получить все позиции для этих заказов одним запросом
    const allOrderItems = await this.drizzle
      .select() // Убрал явное указание полей, так как p_items не используется
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))

    // 4. Сгруппировать позиции по orderId
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

    // 5. Собрать результат: добавить массив items к каждому заказу
    const ordersWithItems: OrderWithItems[] = userOrders.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || [] // Добавляем пустой массив, если у заказа нет позиций (маловероятно)
    }))

    return ordersWithItems
  }

  async getOrderById(orderId: number, userId: number): Promise<OrderWithItems> {
    const orderArray = await this.drizzle
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1)

    if (orderArray.length === 0) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден или не принадлежит вам.`)
    }
    const order = orderArray[0]

    const items = await this.drizzle.select().from(orderItems).where(eq(orderItems.orderId, orderId))

    return { ...order, items }
  }

  async cancelOrder(orderId: number, userId: number): Promise<Order> {
    // Используем транзакцию, чтобы убедиться, что чтение и обновление атомарны
    return this.drizzle.transaction(async (tx) => {
      const orderToCancelArray = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .limit(1)

      if (orderToCancelArray.length === 0) {
        throw new NotFoundException(`Заказ с ID ${orderId} не найден или не принадлежит вам.`)
      }
      const orderToCancel = orderToCancelArray[0]

      // Проверяем, можно ли отменить заказ
      // Например, нельзя отменить уже отправленный или доставленный заказ
      if (['Отправлен', 'Доставлен'].includes(orderToCancel.status)) {
        throw new BadRequestException(`Заказ в статусе "${orderToCancel.status}" не может быть отменен.`)
      }

      if (orderToCancel.status === 'Отменен') {
        // Если уже отменен, просто возвращаем его
        return orderToCancel
      }

      const updatedOrderArray = await tx
        .update(orders)
        .set({ status: 'Отменен' })
        .where(eq(orders.id, orderId)) // userId здесь уже проверен выше
        .returning()

      if (updatedOrderArray.length === 0) {
        // Этого не должно произойти, если предыдущие проверки прошли
        throw new Error('Не удалось отменить заказ.')
      }

      const updatedOrder = updatedOrderArray[0]

      // --- Отправляем email об отмене заказа (опционально, но хорошая практика) ---
      const userInfo = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
      if (userInfo.length > 0 && userInfo[0].email) {
        try {
          await this.emailService.sendOrderStatusUpdateEmail(userInfo[0].email, updatedOrder.id, updatedOrder.status)
        } catch (error) {
          console.error(
            `Ошибка при отправке email об отмене заказа ${updatedOrder.id} пользователю ${userInfo[0].email}:`,
            error
          )
          // Не прерываем процесс из-за ошибки email
        }
      }
      // -------------------------------------------------------------------------

      // --- Логируем отмену заказа (опционально) ---
      await this.logsService.createLog('order_cancelled', userId)
      // --------------------------------------------

      return updatedOrder
    })
  }
}

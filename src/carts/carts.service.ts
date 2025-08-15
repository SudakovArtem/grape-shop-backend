import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db'
import { AddItemToCartDto } from './dto/add-item-to-cart.dto'
import { carts, products, productImages } from '../db/schema' // Импортируем схемы
import { eq, and, asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { LogsService } from '../logs/logs.service' // Импорт LogsService

// Определяем тип DrizzleDB
export type DrizzleDB = typeof db

// Тип для элемента корзины, который будем возвращать
export type CartItem = typeof carts.$inferSelect

// Экспортируем интерфейсы
export interface CartItemWithProductDetails extends Omit<CartItem, 'type'> {
  productName: string | null
  unitPrice: number // Цена за единицу (черенок или саженец)
  itemTotalPrice: number // quantity * unitPrice
  imageUrl?: string | null // Опционально: URL основного изображения продукта
  berryShape?: string | null // Форма ягод
  color?: string | null // Цвет
  taste?: string | null // Вкус
  variety?: string | null // Сорт
  cuttingInStock?: number | null // Количество черенков
  seedlingInStock?: number | null // Количество саженцев
  type: 'cutting' | 'seedling' // Явно указываем более специфичный тип
}

// Тип для ответа метода getCart
export interface CartDetails {
  items: CartItemWithProductDetails[]
  totalCartPrice: number // Общая стоимость корзины
  totalItems: number // Общее количество товаров в корзине
}

@Injectable()
export class CartsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly logsService: LogsService // Инъекция LogsService
  ) {}

  async addItem(userId: number | null, guestId: string | null, addItemDto: AddItemToCartDto): Promise<CartDetails> {
    const { productId, type, quantity = 1 } = addItemDto

    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    // 1. Проверить, существует ли продукт и можно ли его добавить (например, есть ли нужный тип цены)
    const productExists = await this.drizzle
      .select({
        id: products.id,
        cuttingPrice: products.cuttingPrice,
        seedlingPrice: products.seedlingPrice
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (productExists.length === 0) {
      throw new NotFoundException(`Продукт с ID ${productId} не найден`)
    }

    // Проверка, есть ли цена для выбранного типа
    const priceToCheck = type === 'cutting' ? productExists[0].cuttingPrice : productExists[0].seedlingPrice
    if (priceToCheck === null || priceToCheck === undefined) {
      throw new BadRequestException(`Продукт ${productId} недоступен в виде "${type}"`)
    }

    // 2. Найти существующий элемент корзины для этого пользователя/гостя, продукта и типа
    const cartConditions = [eq(carts.productId, productId), eq(carts.type, type)]
    if (userId) {
      cartConditions.push(eq(carts.userId, userId))
    } else {
      cartConditions.push(eq(carts.guestId, guestId!))
    }

    const existingCartItem = await this.drizzle
      .select()
      .from(carts)
      .where(and(...cartConditions))
      .limit(1)

    if (existingCartItem.length > 0) {
      const currentItem = existingCartItem[0]
      const newQuantity = currentItem.quantity + quantity
      const updatedItems = await this.drizzle
        .update(carts)
        .set({ quantity: newQuantity })
        .where(eq(carts.id, currentItem.id))
        .returning()

      if (!updatedItems || updatedItems.length === 0) {
        throw new Error('Не удалось обновить количество товара в корзине')
      }
    } else {
      const cartInsertData: typeof carts.$inferInsert = { productId, type, quantity }
      if (userId) {
        cartInsertData.userId = userId
      } else {
        cartInsertData.guestId = guestId!
      }

      const newCartItems = await this.drizzle.insert(carts).values(cartInsertData).returning()

      if (!newCartItems || newCartItems.length === 0) {
        throw new Error('Не удалось добавить товар в корзину')
      }
    }

    await this.logsService.createLog('cart_item_added_or_updated', userId || undefined, {
      productId,
      type,
      quantity,
      guestId
    })

    // Вернуть полную корзину после добавления/обновления
    return this.getCart(userId, guestId)
  }

  /**
   * Получает содержимое корзины пользователя/гостя с детальной информацией о продуктах
   * @param userId ID пользователя (null для гостей)
   * @param guestId ID гостя (null для авторизованных пользователей)
   * @returns Объект CartDetails, содержащий список товаров с детальной информацией
   * о каждом продукте (включая berryShape, color, taste, variety, imageUrl, inStock), общую стоимость корзины
   * и общее количество товаров (totalItems)
   */
  async getCart(userId: number | null, guestId: string | null = null): Promise<CartDetails> {
    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }
    const p = alias(products, 'p')

    // Создаем условие WHERE для поиска корзины
    const cartWhereCondition = userId ? eq(carts.userId, userId) : eq(carts.guestId, guestId!)

    // Получаем данные корзины с информацией о продуктах
    const cartItemsData = await this.drizzle
      .select({
        // Явно перечисляем поля из carts
        id: carts.id,
        userId: carts.userId,
        guestId: carts.guestId,
        productId: carts.productId,
        type: carts.type,
        quantity: carts.quantity,
        // Поля из products (через alias p)
        productName: p.name,
        cuttingPrice: p.cuttingPrice,
        seedlingPrice: p.seedlingPrice,
        // Дополнительные свойства продукта
        berryShape: p.berryShape,
        color: p.color,
        taste: p.taste,
        variety: p.variety,
        cuttingInStock: p.cuttingInStock,
        seedlingInStock: p.seedlingInStock
      })
      .from(carts)
      .leftJoin(p, eq(carts.productId, p.id))
      .where(cartWhereCondition)

    // Получаем изображения для всех продуктов в корзине
    const productIds = cartItemsData.map((item) => item.productId)
    // Создаем map изображений продуктов
    const productImagesMap: Record<number, string> = {}
    if (productIds.length > 0) {
      // Получаем первое изображение для каждого продукта в одном запросе
      const productImagesData = await this.drizzle
        .select({
          productId: productImages.productId,
          imageUrl: productImages.imageUrl
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.id))

      // Создаем Map, где для каждого productId сохраняем только первое изображение
      const processedProductIds = new Set<number>()
      for (const img of productImagesData) {
        if (!processedProductIds.has(img.productId)) {
          productImagesMap[img.productId] = img.imageUrl
          processedProductIds.add(img.productId)
        }
      }
    }

    let totalCartPrice = 0
    let totalItems = 0
    const items: CartItemWithProductDetails[] = cartItemsData.map((item) => {
      const unitPriceDecimal = item.type === 'cutting' ? item.cuttingPrice : item.seedlingPrice
      // Преобразуем цену из строки (decimal) в число
      const unitPrice = unitPriceDecimal ? parseFloat(unitPriceDecimal) : 0

      const itemTotalPrice = item.quantity * unitPrice
      totalCartPrice += itemTotalPrice
      totalItems += item.quantity

      // Явно создаем объект restOfItem с нужными полями
      const restOfItem = {
        id: item.id,
        userId: item.userId,
        guestId: item.guestId,
        productId: item.productId,
        type: item.type as 'cutting' | 'seedling',
        quantity: item.quantity,
        createdAt: new Date(), // Добавляем поле createdAt
        productName: item.productName,
        berryShape: item.berryShape,
        color: item.color,
        taste: item.taste,
        variety: item.variety,
        cuttingInStock: item.cuttingInStock,
        seedlingInStock: item.seedlingInStock,
        imageUrl: productImagesMap[item.productId] || null
      }

      return {
        ...restOfItem,
        unitPrice,
        itemTotalPrice
      }
    })

    return {
      items,
      totalCartPrice,
      totalItems
    }
  }

  async updateItemQuantity(
    userId: number | null,
    guestId: string | null,
    itemId: number,
    quantity: number
  ): Promise<CartItem> {
    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    // 1. Найти элемент по itemId
    const cartItem = await this.drizzle.select().from(carts).where(eq(carts.id, itemId)).limit(1)

    if (cartItem.length === 0) {
      throw new NotFoundException(`Элемент корзины с ID ${itemId} не найден`)
    }

    // 2. Проверить, принадлежит ли он пользователю/гостю
    const belongsToUser = userId && cartItem[0].userId === userId
    const belongsToGuest = guestId && cartItem[0].guestId === guestId

    if (!belongsToUser && !belongsToGuest) {
      throw new ForbiddenException('Вы не можете изменять этот элемент корзины')
    }

    // 3. Обновить количество (quantity уже провалидировано DTO > 0)
    const updatedItems = await this.drizzle.update(carts).set({ quantity }).where(eq(carts.id, itemId)).returning()

    if (!updatedItems || updatedItems.length === 0) {
      throw new Error('Не удалось обновить количество товара в корзине')
    }
    return updatedItems[0]
  }

  async removeItem(userId: number | null, guestId: string | null, itemId: number): Promise<CartDetails> {
    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    // 1. Найти элемент по itemId
    const cartItem = await this.drizzle
      .select({ id: carts.id, userId: carts.userId, guestId: carts.guestId }) // Выбираем только нужные поля
      .from(carts)
      .where(eq(carts.id, itemId))
      .limit(1)

    if (cartItem.length === 0) {
      // Можно либо ничего не делать (идемпотентность), либо кидать ошибку
      // Оставим NotFoundException для явности
      throw new NotFoundException(`Элемент корзины с ID ${itemId} не найден`)
    }

    // 2. Проверить, принадлежит ли он пользователю/гостю
    const belongsToUser = userId && cartItem[0].userId === userId
    const belongsToGuest = guestId && cartItem[0].guestId === guestId

    if (!belongsToUser && !belongsToGuest) {
      throw new ForbiddenException('Вы не можете удалять этот элемент корзины')
    }

    // 3. Удалить элемент
    await this.drizzle.delete(carts).where(eq(carts.id, itemId))

    // Вернуть полную корзину после удаления
    return this.getCart(userId, guestId)
  }

  /**
   * Переносит корзину гостя пользователю при авторизации
   */
  async migrateGuestCartToUser(guestId: string, userId: number): Promise<void> {
    await this.drizzle.transaction(async (tx) => {
      // Получаем товары из гостевой корзины
      const guestCartItems = await tx.select().from(carts).where(eq(carts.guestId, guestId))

      if (guestCartItems.length === 0) {
        return // Нет товаров для переноса
      }

      // Получаем существующие товары в корзине пользователя
      const userCartItems = await tx.select().from(carts).where(eq(carts.userId, userId))

      // Создаем мапу существующих товаров пользователя для быстрого поиска
      const userCartMap = new Map<string, typeof carts.$inferSelect>()
      userCartItems.forEach((item) => {
        const key = `${item.productId}_${item.type}`
        userCartMap.set(key, item)
      })

      // Обрабатываем каждый товар из гостевой корзины
      for (const guestItem of guestCartItems) {
        const key = `${guestItem.productId}_${guestItem.type}`
        const existingUserItem = userCartMap.get(key)

        if (existingUserItem) {
          // Если такой товар уже есть в корзине пользователя, увеличиваем количество
          await tx
            .update(carts)
            .set({ quantity: existingUserItem.quantity + guestItem.quantity })
            .where(eq(carts.id, existingUserItem.id))
        } else {
          // Если товара нет, создаем новую запись для пользователя
          await tx.insert(carts).values({
            userId,
            productId: guestItem.productId,
            type: guestItem.type,
            quantity: guestItem.quantity
          })
        }
      }

      // Удаляем гостевую корзину
      await tx.delete(carts).where(eq(carts.guestId, guestId))
    })
  }
}

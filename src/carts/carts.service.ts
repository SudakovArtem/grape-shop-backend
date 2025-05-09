import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db'
import { AddItemToCartDto } from './dto/add-item-to-cart.dto'
import { carts, products } from '../db/schema' // Импортируем схемы
import { eq, and } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { LogsService } from '../logs/logs.service' // Импорт LogsService

// Определяем тип DrizzleDB
export type DrizzleDB = typeof db

// Тип для элемента корзины, который будем возвращать
export type CartItem = typeof carts.$inferSelect

// Экспортируем интерфейсы
export interface CartItemWithProductDetails extends CartItem {
  productName: string | null
  unitPrice: number // Цена за единицу (черенок или саженец)
  itemTotalPrice: number // quantity * unitPrice
  imageUrl?: string // Опционально: URL основного изображения продукта
}

// Тип для ответа метода getCart
export interface CartDetails {
  items: CartItemWithProductDetails[]
  totalCartPrice: number // Общая стоимость корзины
}

@Injectable()
export class CartsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly logsService: LogsService // Инъекция LogsService
  ) {}

  async addItem(userId: number, addItemDto: AddItemToCartDto): Promise<CartItem> {
    const { productId, type, quantity = 1 } = addItemDto

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

    // 2. Найти существующий элемент корзины для этого пользователя, продукта и типа
    let cartItem: CartItem
    const existingCartItem = await this.drizzle
      .select()
      .from(carts)
      .where(and(eq(carts.userId, userId), eq(carts.productId, productId), eq(carts.type, type)))
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
      cartItem = updatedItems[0]
    } else {
      const newCartItems = await this.drizzle.insert(carts).values({ userId, productId, type, quantity }).returning()

      if (!newCartItems || newCartItems.length === 0) {
        throw new Error('Не удалось добавить товар в корзину')
      }
      cartItem = newCartItems[0]
    }

    await this.logsService.createLog('cart_item_added_or_updated', userId)

    return cartItem
  }

  async getCart(userId: number): Promise<CartDetails> {
    const p = alias(products, 'p')

    const cartItemsData = await this.drizzle
      .select({
        // Явно перечисляем поля из carts
        id: carts.id,
        userId: carts.userId,
        productId: carts.productId,
        type: carts.type,
        quantity: carts.quantity,
        // Поля из products (через alias p)
        productName: p.name,
        cuttingPrice: p.cuttingPrice,
        seedlingPrice: p.seedlingPrice
        // imageUrl: ... (пока без изображения)
      })
      .from(carts)
      .leftJoin(p, eq(carts.productId, p.id))
      .where(eq(carts.userId, userId))

    let totalCartPrice = 0
    const items: CartItemWithProductDetails[] = cartItemsData.map((item) => {
      const unitPriceDecimal = item.type === 'cutting' ? item.cuttingPrice : item.seedlingPrice
      // Преобразуем цену из строки (decimal) в число
      const unitPrice = unitPriceDecimal ? parseFloat(unitPriceDecimal) : 0

      const itemTotalPrice = item.quantity * unitPrice
      totalCartPrice += itemTotalPrice

      // Явно создаем объект restOfItem с нужными полями
      const restOfItem = {
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        type: item.type,
        quantity: item.quantity,
        productName: item.productName
        // imageUrl: item.imageUrl // Раскомментируйте, если imageUrl используется
      }

      return {
        ...restOfItem,
        unitPrice,
        itemTotalPrice
      }
    })

    return {
      items,
      totalCartPrice
    }
  }

  async updateItemQuantity(userId: number, itemId: number, quantity: number): Promise<CartItem> {
    // 1. Найти элемент по itemId
    const cartItem = await this.drizzle.select().from(carts).where(eq(carts.id, itemId)).limit(1)

    if (cartItem.length === 0) {
      throw new NotFoundException(`Элемент корзины с ID ${itemId} не найден`)
    }

    // 2. Проверить, принадлежит ли он пользователю
    if (cartItem[0].userId !== userId) {
      throw new ForbiddenException('Вы не можете изменять этот элемент корзины')
    }

    // 3. Обновить количество (quantity уже провалидировано DTO > 0)
    const updatedItems = await this.drizzle.update(carts).set({ quantity }).where(eq(carts.id, itemId)).returning()

    if (!updatedItems || updatedItems.length === 0) {
      throw new Error('Не удалось обновить количество товара в корзине')
    }
    return updatedItems[0]
  }

  async removeItem(userId: number, itemId: number): Promise<void> {
    // 1. Найти элемент по itemId
    const cartItem = await this.drizzle
      .select({ id: carts.id, userId: carts.userId }) // Выбираем только нужные поля
      .from(carts)
      .where(eq(carts.id, itemId))
      .limit(1)

    if (cartItem.length === 0) {
      // Можно либо ничего не делать (идемпотентность), либо кидать ошибку
      // Оставим NotFoundException для явности
      throw new NotFoundException(`Элемент корзины с ID ${itemId} не найден`)
    }

    // 2. Проверить, принадлежит ли он пользователю
    if (cartItem[0].userId !== userId) {
      throw new ForbiddenException('Вы не можете удалять этот элемент корзины')
    }

    // 3. Удалить элемент
    await this.drizzle.delete(carts).where(eq(carts.id, itemId))
  }
}

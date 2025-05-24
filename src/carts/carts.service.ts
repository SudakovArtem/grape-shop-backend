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
export interface CartItemWithProductDetails extends CartItem {
  productName: string | null
  unitPrice: number // Цена за единицу (черенок или саженец)
  itemTotalPrice: number // quantity * unitPrice
  imageUrl?: string | null // Опционально: URL основного изображения продукта
  berryShape?: string | null // Форма ягод
  color?: string | null // Цвет
  taste?: string | null // Вкус
  variety?: string | null // Сорт
  inStock?: boolean | null // Наличие товара на складе
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

  /**
   * Получает содержимое корзины пользователя с детальной информацией о продуктах
   * @param userId ID пользователя
   * @returns Объект CartDetails, содержащий список товаров с детальной информацией
   * о каждом продукте (включая berryShape, color, taste, variety, imageUrl, inStock), общую стоимость корзины
   * и общее количество товаров (totalItems)
   */
  async getCart(userId: number): Promise<CartDetails> {
    const p = alias(products, 'p')

    // Получаем данные корзины с информацией о продуктах
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
        seedlingPrice: p.seedlingPrice,
        // Дополнительные свойства продукта
        berryShape: p.berryShape,
        color: p.color,
        taste: p.taste,
        variety: p.variety,
        inStock: p.inStock
      })
      .from(carts)
      .leftJoin(p, eq(carts.productId, p.id))
      .where(eq(carts.userId, userId))

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
        productId: item.productId,
        type: item.type,
        quantity: item.quantity,
        productName: item.productName,
        berryShape: item.berryShape,
        color: item.color,
        taste: item.taste,
        variety: item.variety,
        inStock: item.inStock,
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

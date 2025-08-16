import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db'
import { favorites, products, productImages } from '../db/schema'
import { eq, and, asc, inArray, desc, sql } from 'drizzle-orm'
import { AddToFavoritesDto } from './dto/add-to-favorites.dto'
import { FavoriteResponseDto } from './dto/favorite-response.dto'
import { PaginatedFavoriteResponseDto } from './dto/paginated-favorite-response.dto'
import { FindAllFavoritesQueryDto } from './dto/find-all-favorites-query.dto'
import { LogsService } from '../logs/logs.service'

// Определяем тип DrizzleDB
export type DrizzleDB = typeof db

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly logsService: LogsService
  ) {}

  /**
   * Добавляет продукт в избранное пользователя/гостя
   */
  async addToFavorites(
    userId: number | null,
    guestId: string | null,
    addToFavoritesDto: AddToFavoritesDto
  ): Promise<FavoriteResponseDto> {
    const { productId } = addToFavoritesDto

    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    // Проверяем, существует ли продукт
    const productExists = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (productExists.length === 0) {
      throw new NotFoundException(`Продукт с ID ${productId} не найден`)
    }

    // Проверяем, не добавлен ли уже продукт в избранное
    const conditions = [eq(favorites.productId, productId)]
    if (userId) {
      conditions.push(eq(favorites.userId, userId))
    } else {
      conditions.push(eq(favorites.guestId, guestId!))
    }

    const existingFavorite = await this.drizzle
      .select()
      .from(favorites)
      .where(and(...conditions))
      .limit(1)

    if (existingFavorite.length > 0) {
      throw new ConflictException('Продукт уже добавлен в избранное')
    }

    // Добавляем в избранное
    const favoriteData: typeof favorites.$inferInsert = { productId }
    if (userId) {
      favoriteData.userId = userId
    } else {
      favoriteData.guestId = guestId!
    }

    const [newFavorite] = await this.drizzle.insert(favorites).values(favoriteData).returning()

    await this.logsService.createLog('favorite_added', userId || undefined, {
      productId,
      guestId
    })

    // Возвращаем полную информацию о добавленном избранном
    return this.getFavoriteById(newFavorite.id)
  }

  /**
   * Удаляет продукт из избранного
   */
  async removeFromFavorites(userId: number | null, guestId: string | null, productId: number): Promise<void> {
    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    // Формируем условия для поиска
    const conditions = [eq(favorites.productId, productId)]
    if (userId) {
      conditions.push(eq(favorites.userId, userId))
    } else {
      conditions.push(eq(favorites.guestId, guestId!))
    }

    // Удаляем из избранного
    const result = await this.drizzle
      .delete(favorites)
      .where(and(...conditions))
      .returning()

    if (result.length === 0) {
      throw new NotFoundException('Продукт не найден в избранном')
    }

    await this.logsService.createLog('favorite_removed', userId || undefined, {
      productId,
      guestId
    })
  }

  /**
   * Получает список избранных продуктов пользователя/гостя с пагинацией
   */
  async getFavorites(
    userId: number | null,
    guestId: string | null,
    query: FindAllFavoritesQueryDto
  ): Promise<PaginatedFavoriteResponseDto> {
    // Проверяем, что предоставлен либо userId, либо guestId
    if (!userId && !guestId) {
      throw new BadRequestException('Требуется авторизация или guest-id')
    }

    const { page = 1, limit = 10 } = query
    const offset = (page - 1) * limit

    // Формируем условие WHERE для поиска избранного
    const whereCondition = userId ? eq(favorites.userId, userId) : eq(favorites.guestId, guestId!)

    // Получаем общее количество избранных продуктов
    const countResult = await this.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(favorites)
      .where(whereCondition)
    const count = countResult[0]?.count || 0

    // Получаем данные избранного с информацией о продуктах
    const favoritesData = await this.drizzle
      .select({
        // Поля из favorites
        id: favorites.id,
        productId: favorites.productId,
        createdAt: favorites.createdAt,
        // Поля из products
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
        cuttingPrice: products.cuttingPrice,
        seedlingPrice: products.seedlingPrice,
        berryShape: products.berryShape,
        color: products.color,
        taste: products.taste,
        variety: products.variety,
        cuttingInStock: products.cuttingInStock,
        seedlingInStock: products.seedlingInStock
      })
      .from(favorites)
      .leftJoin(products, eq(favorites.productId, products.id))
      .where(whereCondition)
      .orderBy(desc(favorites.createdAt))
      .limit(limit)
      .offset(offset)

    // Получаем изображения для всех продуктов
    const productIds = favoritesData.map((item) => item.productId)
    const productImagesMap: Record<number, string> = {}

    if (productIds.length > 0) {
      const productImagesData = await this.drizzle
        .select({
          productId: productImages.productId,
          imageUrl: productImages.imageUrl
        })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.id))

      // Сохраняем только первое изображение для каждого продукта
      const processedProductIds = new Set<number>()
      for (const img of productImagesData) {
        if (!processedProductIds.has(img.productId)) {
          productImagesMap[img.productId] = img.imageUrl
          processedProductIds.add(img.productId)
        }
      }
    }

    // Формируем ответ
    const data: FavoriteResponseDto[] = favoritesData.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName!,
      productSlug: item.productSlug!,
      productDescription: item.productDescription,
      cuttingPrice: item.cuttingPrice ? parseFloat(item.cuttingPrice) : null,
      seedlingPrice: item.seedlingPrice ? parseFloat(item.seedlingPrice) : null,
      imageUrl: productImagesMap[item.productId] || null,
      berryShape: item.berryShape,
      color: item.color,
      taste: item.taste,
      variety: item.variety,
      cuttingInStock: item.cuttingInStock,
      seedlingInStock: item.seedlingInStock,
      createdAt: item.createdAt!
    }))

    const totalCount = parseInt(String(count)) || 0

    return {
      data,
      meta: {
        total: totalCount,
        page,
        limit,
        lastPage: Math.ceil(totalCount / limit)
      }
    }
  }

  /**
   * Проверяет, находится ли продукт в избранном
   */
  async isFavorite(userId: number | null, guestId: string | null, productId: number): Promise<boolean> {
    if (!userId && !guestId) {
      return false
    }

    const conditions = [eq(favorites.productId, productId)]
    if (userId) {
      conditions.push(eq(favorites.userId, userId))
    } else {
      conditions.push(eq(favorites.guestId, guestId!))
    }

    const result = await this.drizzle
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(...conditions))
      .limit(1)

    return result.length > 0
  }

  /**
   * Переносит избранное гостя пользователю при авторизации
   */
  async migrateGuestFavoritesToUser(guestId: string, userId: number): Promise<void> {
    await this.drizzle.transaction(async (tx) => {
      // Получаем избранное гостя
      const guestFavorites = await tx.select().from(favorites).where(eq(favorites.guestId, guestId))

      if (guestFavorites.length === 0) {
        return // Нет избранного для переноса
      }

      // Получаем существующее избранное пользователя
      const userFavorites = await tx.select().from(favorites).where(eq(favorites.userId, userId))

      // Создаем Set для быстрой проверки существующих продуктов
      const userProductIds = new Set(userFavorites.map((f) => f.productId))

      // Добавляем только те продукты, которых еще нет в избранном пользователя
      const newFavorites = guestFavorites
        .filter((gf) => !userProductIds.has(gf.productId))
        .map((gf) => ({
          userId,
          productId: gf.productId
        }))

      if (newFavorites.length > 0) {
        await tx.insert(favorites).values(newFavorites)
      }

      // Удаляем избранное гостя
      await tx.delete(favorites).where(eq(favorites.guestId, guestId))
    })
  }

  /**
   * Получает полную информацию об избранном по ID
   */
  private async getFavoriteById(id: number): Promise<FavoriteResponseDto> {
    const result = await this.drizzle
      .select({
        // Поля из favorites
        id: favorites.id,
        productId: favorites.productId,
        createdAt: favorites.createdAt,
        // Поля из products
        productName: products.name,
        productSlug: products.slug,
        productDescription: products.description,
        cuttingPrice: products.cuttingPrice,
        seedlingPrice: products.seedlingPrice,
        berryShape: products.berryShape,
        color: products.color,
        taste: products.taste,
        variety: products.variety,
        cuttingInStock: products.cuttingInStock,
        seedlingInStock: products.seedlingInStock
      })
      .from(favorites)
      .leftJoin(products, eq(favorites.productId, products.id))
      .where(eq(favorites.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new NotFoundException('Избранное не найдено')
    }

    const item = result[0]

    // Получаем главное изображение продукта
    const [productImage] = await this.drizzle
      .select({ imageUrl: productImages.imageUrl })
      .from(productImages)
      .where(eq(productImages.productId, item.productId))
      .orderBy(asc(productImages.id))
      .limit(1)

    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName!,
      productSlug: item.productSlug!,
      productDescription: item.productDescription,
      cuttingPrice: item.cuttingPrice ? parseFloat(item.cuttingPrice) : null,
      seedlingPrice: item.seedlingPrice ? parseFloat(item.seedlingPrice) : null,
      imageUrl: productImage?.imageUrl || null,
      berryShape: item.berryShape,
      color: item.color,
      taste: item.taste,
      variety: item.variety,
      cuttingInStock: item.cuttingInStock,
      seedlingInStock: item.seedlingInStock,
      createdAt: item.createdAt!
    }
  }
}

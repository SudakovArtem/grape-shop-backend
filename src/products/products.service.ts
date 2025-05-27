import { Inject, Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db' // Предполагается, что db экспортируется из этого пути
import { products, categories, productImages, carts, orderItems } from '../db/schema' // Импортируем нужные схемы
import { eq, sql, and, or, gte, lte, ilike, SQL, getTableColumns, countDistinct, asc, desc } from 'drizzle-orm' // Импортируем eq, sql, and, or, gte, lte, ilike, SQL, getTableColumns, countDistinct, asc, desc
import { FindAllProductsQueryDto, ProductSortBy } from './dto/find-all-products-query.dto' // Импортируем DTO и ProductSortBy
import { CreateProductDto } from './dto/create-product.dto' // Импортируем CreateProductDto
import { UpdateProductDto } from './dto/update-product.dto' // Импортируем UpdateProductDto
import { AwsS3Service } from '../aws/aws-s3.service' // Импортируем AwsS3Service
import { generateSlug } from '../common/utils/slug.utils'; // Импортируем утилиту для генерации slug

// Повторно определим тип DrizzleDB, если он не экспортируется из другого места глобально
// или можно было бы вынести его в общий файл типов.
export type DrizzleDB = typeof db
// Тип для результата основного запроса
type ProductQueryResult = Omit<typeof products.$inferSelect, 'password'> & { categoryName: string | null }
// Тип для конечного результата с изображениями
type ProductWithImages = ProductQueryResult & { images: { id: number; url: string }[] }

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB,
    private readonly awsS3Service: AwsS3Service // Инъектируем AwsS3Service
  ) {}

  async create(createProductDto: CreateProductDto): Promise<typeof products.$inferSelect> {
    const { variety, cuttingPrice, seedlingPrice, slug, ...restOfDto } = createProductDto

    let productSlug = slug
    if (!productSlug) {
      productSlug = generateSlug(createProductDto.name)
    }

    // Проверка уникальности slug
    let existingProductWithSlug = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, productSlug))
      .limit(1)

    let counter = 1
    while (existingProductWithSlug.length > 0) {
      productSlug = `${generateSlug(createProductDto.name)}-${counter}`;
      existingProductWithSlug = await this.drizzle
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, productSlug))
        .limit(1)
      counter++;
    }

    const newProductData: typeof products.$inferInsert = {
      ...restOfDto,
      slug: productSlug, // Используем сгенерированный или предоставленный slug
      variety: variety ?? createProductDto.name, // Если variety не указан, используем name
      // Преобразуем цены в строки для Drizzle, если они есть. Drizzle ожидает string для decimal.
      cuttingPrice: cuttingPrice !== undefined && cuttingPrice !== null ? String(cuttingPrice) : null,
      seedlingPrice: seedlingPrice !== undefined && seedlingPrice !== null ? String(seedlingPrice) : null
      // createdAt и updatedAt будут установлены по умолчанию базой данных
    }

    const result = await this.drizzle.insert(products).values(newProductData).returning() // Возвращает все поля созданной записи

    if (!result || result.length === 0) {
      // Эта ситуация маловероятна с Drizzle, т.к. ошибка вставки обычно вызывает исключение
      throw new Error('Не удалось создать продукт')
    }
    return result[0]
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<typeof products.$inferSelect> {
    // Сначала проверяем, существует ли продукт
    const existingProduct = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (existingProduct.length === 0) {
      throw new NotFoundException(`Продукт с ID ${id} не найден для обновления`)
    }

    const { cuttingPrice, seedlingPrice, ...restOfDto } = updateProductDto
    const dataToUpdate: Partial<typeof products.$inferInsert> = { ...restOfDto }

    // Обрабатываем цены, если они есть в DTO
    if ('cuttingPrice' in updateProductDto) {
      dataToUpdate.cuttingPrice = cuttingPrice !== undefined && cuttingPrice !== null ? String(cuttingPrice) : null
    }
    if ('seedlingPrice' in updateProductDto) {
      dataToUpdate.seedlingPrice = seedlingPrice !== undefined && seedlingPrice !== null ? String(seedlingPrice) : null
    }

    // Добавляем updatedAt вручную, если не настроено автоматическое обновление в БД через триггер
    // dataToUpdate.updatedAt = new Date();
    // В текущей схеме Drizzle updatedAt: timestamp('updated_at').defaultNow() - это только при создании.
    // Для обновления нужно либо .set({ updatedAt: new Date() }) в Drizzle, либо триггер в БД.
    // Пока оставим как есть, Drizzle не обновит updatedAt автоматически при update, если не указано в .set().
    // Если нужно обновлять updatedAt, то его стоит добавить в dataToUpdate или использовать хуки Drizzle, если они есть.
    // Для простоты можно добавить: dataToUpdate.updatedAt = sql`now()`; или new Date()

    if (Object.keys(dataToUpdate).length === 0) {
      // Если нет данных для обновления (например, пустой DTO), можно вернуть существующий продукт
      // или выбросить ошибку. Чтобы избежать лишнего запроса, мы уже получили existingProduct.
      // Но чтобы вернуть полный объект, потребуется еще один запрос.
      // Проще всего вернуть результат findOne, если ничего не изменилось.
      return this.findOne(id) // findOne возвращает продукт с категорией и изображениями
    }

    const result = await this.drizzle
      .update(products)
      .set(dataToUpdate) // Drizzle автоматически обработает только переданные поля
      .where(eq(products.id, id))
      .returning()

    if (!result || result.length === 0) {
      // Эта ситуация маловероятна, если проверка existingProduct пройдена
      throw new NotFoundException(`Продукт с ID ${id} не удалось обновить`)
    }
    // После обновления лучше вернуть данные с джойнами, как в findOne
    return this.findOne(id)
  }

  // Обновленный метод findAll с фильтрацией и пагинацией (переписан без $dynamic)
  async findAll(queryDto: FindAllProductsQueryDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      minPrice,
      maxPrice,
      variety,
      maturationPeriod,
      berryShape,
      color,
      taste,
      search,
      sortBy = ProductSortBy.CreatedAtDesc
    } = queryDto

    const offset = (page - 1) * limit
    const conditions: (SQL | undefined)[] = []

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId))
    }
    if (variety) {
      // Поиск по сорту (можно использовать ilike для регистронезависимого поиска)
      conditions.push(ilike(products.variety, `%${variety}%`))
    }
    if (maturationPeriod) {
      conditions.push(eq(products.maturationPeriod, maturationPeriod))
    }
    if (berryShape) {
      conditions.push(eq(products.berryShape, berryShape))
    }
    if (color) {
      conditions.push(eq(products.color, color))
    }
    if (taste) {
      conditions.push(eq(products.taste, taste))
    }

    // Фильтр по цене (учитывает цену черенка ИЛИ саженца)
    const priceConditions: (SQL | undefined)[] = []
    if (minPrice !== undefined) {
      priceConditions.push(
        or(gte(products.cuttingPrice, String(minPrice)), gte(products.seedlingPrice, String(minPrice)))
      )
    }
    if (maxPrice !== undefined) {
      priceConditions.push(
        or(lte(products.cuttingPrice, String(maxPrice)), lte(products.seedlingPrice, String(maxPrice)))
      )
    }
    if (priceConditions.length > 0) {
      conditions.push(and(...priceConditions.filter((c): c is SQL => !!c)))
    }

    // Поиск по ключевым словам (в названии ИЛИ описании)
    if (search) {
      conditions.push(ilike(products.name, `%${search}%`))
    }

    // Формируем финальное условие WHERE
    const whereCondition = conditions.length > 0 ? and(...conditions.filter((c): c is SQL => !!c)) : undefined

    // Получаем выбранные колонки продукта и имя категории
    const selectedProductColumns = getTableColumns(products)

    // Определяем порядок сортировки
    let orderByClause: SQL | SQL[]
    switch (sortBy) {
      case ProductSortBy.NameAsc:
        orderByClause = asc(products.name)
        break
      case ProductSortBy.NameDesc:
        orderByClause = desc(products.name)
        break
      case ProductSortBy.PriceAsc:
        orderByClause = sql`${products.seedlingPrice} asc nulls last`
        break
      case ProductSortBy.PriceDesc:
        orderByClause = sql`${products.seedlingPrice} desc nulls first`
        break
      case ProductSortBy.CreatedAtAsc:
        orderByClause = asc(products.createdAt)
        break
      case ProductSortBy.CreatedAtDesc:
      default:
        orderByClause = desc(products.createdAt)
        break
    }

    // Выполняем основной запрос
    const results = await this.drizzle
      .select({
        ...selectedProductColumns,
        categoryName: categories.name
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereCondition)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    // Выполняем запрос для общего количества
    // Используем countDistinct для подсчета уникальных ID продуктов
    const totalResult = await this.drizzle
      .select({ count: countDistinct(products.id) })
      .from(products)
      // TODO: Оптимизировать join для count, если фильтры требуют join-ов (например, по categoryName)
      .where(whereCondition)

    const total = totalResult[0].count

    // Получаем изображения для продуктов на текущей странице
    let productsWithImages: ProductWithImages[] = []
    if (results.length > 0) {
      const productIds = results.map((p) => p.id)
      const imagesData = await this.drizzle
        .select({
          productId: productImages.productId,
          id: productImages.id,
          imageUrl: productImages.imageUrl
        })
        .from(productImages)
        .where(sql`${productImages.productId} IN ${productIds}`)

      const imagesMap = imagesData.reduce(
        (acc, img) => {
          if (!acc[img.productId]) {
            acc[img.productId] = []
          }
          acc[img.productId].push({ id: img.id, url: img.imageUrl })
          return acc
        },
        {} as Record<number, { id: number; url: string }[]>
      )

      // Добавляем изображения к результатам
      productsWithImages = results.map((product) => ({
        ...product,
        images: imagesMap[product.id] || []
      }))
    }

    return {
      data: productsWithImages,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    }
  }

  async findOne(id: number) {
    // Получаем основные данные продукта и имя категории
    const productData = await this.drizzle
      .select({
        ...getTableColumns(products),
        categoryName: categories.name
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1)

    if (productData.length === 0) {
      throw new NotFoundException(`Продукт с ID ${id} не найден`)
    }

    // Получаем все изображения для этого продукта
    const imagesData = await this.drizzle
      .select({
        id: productImages.id,
        imageUrl: productImages.imageUrl
      })
      .from(productImages)
      .where(eq(productImages.productId, id))

    const product = productData[0]
    const images = imagesData.map((img) => ({ id: img.id, url: img.imageUrl }))

    return {
      ...product,
      images
    }
  }

  async getProductBySlug(slug: string) {
    // Получаем основные данные продукта и имя категории по slug
    const productData = await this.drizzle
      .select({
        ...getTableColumns(products),
        categoryName: categories.name
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1)

    if (productData.length === 0) {
      throw new NotFoundException(`Продукт со slug "${slug}" не найден`)
    }

    const product = productData[0]

    // Получаем все изображения для этого продукта
    const imagesData = await this.drizzle
      .select({
        id: productImages.id,
        imageUrl: productImages.imageUrl
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))

    const images = imagesData.map((img) => ({ id: img.id, url: img.imageUrl }))

    return {
      ...product,
      images
    }
  }

  async remove(id: number): Promise<void> {
    // 1. Проверяем, существует ли продукт
    const productExists = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (productExists.length === 0) {
      throw new NotFoundException(`Продукт с ID ${id} не найден для удаления`)
    }

    // 2. Проверяем, связан ли продукт с какими-либо позициями в заказах
    const relatedOrderItems = await this.drizzle
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.productId, id))
      .limit(1)

    if (relatedOrderItems.length > 0) {
      throw new ConflictException(
        `Продукт с ID ${id} не может быть удален, так как он используется в существующих заказах. Рассмотрите возможность архивации продукта.`
      )
    }

    // 3. Выполняем удаление в транзакции
    await this.drizzle.transaction(async (tx) => {
      // Удаляем связанные изображения
      await tx.delete(productImages).where(eq(productImages.productId, id))
      // Удаляем связанные элементы корзин
      await tx.delete(carts).where(eq(carts.productId, id))
      // Удаляем сам продукт
      await tx.delete(products).where(eq(products.id, id))
    })

    // Логирование удаления может быть добавлено здесь, если требуется
    // await this.logsService.createLog('product_deleted', undefined, { productId: id });
  }

  async addProductImage(
    productId: number,
    file: Express.Multer.File,
    isPrimary?: boolean
  ): Promise<typeof productImages.$inferSelect> {
    // 1. Проверяем, существует ли продукт
    const productExists = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)

    if (productExists.length === 0) {
      throw new NotFoundException(`Продукт с ID ${productId} не найден`)
    }

    // 2. Загружаем файл в S3
    // Можно указать папку для изображений продуктов, например 'products'
    const s3FileKey = await this.awsS3Service.uploadFile(file, 'products')
    const imageUrl = this.awsS3Service.getFileUrl(s3FileKey) // Получаем полный URL

    // 3. Если isPrimary = true, снимаем этот флаг с других изображений продукта
    if (isPrimary) {
      await this.drizzle.update(productImages).set({ isPrimary: false }).where(eq(productImages.productId, productId))
    }

    // 4. Сохраняем информацию об изображении в БД
    const newImage = await this.drizzle
      .insert(productImages)
      .values({
        productId,
        imageUrl, // Сохраняем полный URL
        s3FileKey, // Сохраняем ключ файла в S3 для возможности удаления
        isPrimary: isPrimary ?? false // Если isPrimary не передан, считаем false
      })
      .returning()

    if (newImage.length === 0) {
      // Если не удалось сохранить, возможно, нужно удалить загруженный файл из S3
      await this.awsS3Service.deleteFile(s3FileKey)
      throw new InternalServerErrorException('Не удалось сохранить информацию об изображении')
    }

    return newImage[0]
  }

  async removeProductImage(productId: number, imageId: number): Promise<void> {
    // 1. Находим изображение в БД, чтобы получить s3FileKey и проверить принадлежность продукту
    const imageRecord = await this.drizzle
      .select({
        id: productImages.id,
        productId: productImages.productId,
        s3FileKey: productImages.s3FileKey,
        isPrimary: productImages.isPrimary
      })
      .from(productImages)
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
      .limit(1)

    if (imageRecord.length === 0) {
      throw new NotFoundException(`Изображение с ID ${imageId} для продукта ID ${productId} не найдено`)
    }

    const { s3FileKey, isPrimary } = imageRecord[0]

    // 2. Удаляем файл из S3
    await this.awsS3Service.deleteFile(s3FileKey)

    // 3. Удаляем запись из БД
    await this.drizzle.delete(productImages).where(eq(productImages.id, imageId))

    // 4. Логика обработки, если удалено основное изображение (опционально, для улучшения UX)
    if (isPrimary) {
      // Найти другое изображение для этого продукта и сделать его основным
      const otherImages = await this.drizzle
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(productImages.createdAt) // или desc(productImages.createdAt) для самого нового
        .limit(1)

      if (otherImages.length > 0) {
        await this.drizzle.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, otherImages[0].id))
      }
    }
    // Логирование удаления изображения может быть добавлено здесь
  }

  // TODO: Добавить методы create, update, remove, работу с категориями и изображениями
}

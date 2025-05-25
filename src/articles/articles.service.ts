import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { db } from '../db'
import { articles, users, articleCategories } from '../db/schema'
import { eq, sql, desc, asc, and } from 'drizzle-orm'
import { CreateArticleDto, UpdateArticleDto, FindAllArticlesQueryDto, SortOrder } from './dto'

@Injectable()
export class ArticlesService {
  async create(createArticleDto: CreateArticleDto, authorId: number) {
    // Проверка на уникальность slug
    const existingArticle = await db.select().from(articles).where(eq(articles.slug, createArticleDto.slug)).limit(1)
    if (existingArticle.length > 0) {
      throw new BadRequestException(`Статья с slug "${createArticleDto.slug}" уже существует`)
    }

    // Используем URL изображения из DTO
    const imageUrl = createArticleDto.imageUrl || null

    // Создаем новую статью
    const newArticle = await db
      .insert(articles)
      .values({
        title: createArticleDto.title,
        content: createArticleDto.content,
        slug: createArticleDto.slug,
        published: createArticleDto.published ?? true,
        authorId,
        categoryId: createArticleDto.categoryId || null,
        imageUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    // Получаем данные автора
    const author = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1)

    // Получаем данные категории, если она указана
    let categoryName: string | null = null
    if (createArticleDto.categoryId) {
      const categoryResult = await db
        .select({ name: articleCategories.name })
        .from(articleCategories)
        .where(eq(articleCategories.id, createArticleDto.categoryId))
        .limit(1)

      if (categoryResult.length > 0) {
        categoryName = categoryResult[0].name
      }
    }

    return {
      ...newArticle[0],
      authorName: author.length > 0 ? author[0].name : null,
      categoryName
    }
  }

  async findAll(query: FindAllArticlesQueryDto, isAdmin = false) {
    const {
      page = 1,
      limit = 10,
      search,
      published,
      categoryId,
      sortBy = 'createdAt',
      sortOrder = SortOrder.DESC
    } = query
    const offset = (page - 1) * limit

    // Базовое условие: если не админ, показываем только опубликованные статьи
    const conditions = isAdmin ? [] : [eq(articles.published, true)]

    // Добавляем фильтр по статусу публикации (только для админов)
    if (isAdmin && published !== undefined) {
      conditions.push(eq(articles.published, published))
    }

    // Добавляем фильтр по категории, если он указан
    if (categoryId) {
      conditions.push(eq(articles.categoryId, categoryId))
    }

    // Добавляем поиск по заголовку и содержимому
    if (search) {
      conditions.push(
        sql`(${articles.title} ILIKE ${'%' + search + '%'} OR ${articles.content} ILIKE ${'%' + search + '%'})`
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Получаем общее количество статей
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(whereClause)
    const total = Number(totalResult[0].count)

    // Определяем порядок сортировки
    const orderByColumn =
      sortBy === 'title' ? articles.title : sortBy === 'updatedAt' ? articles.updatedAt : articles.createdAt // По умолчанию сортируем по дате создания

    // Получаем статьи с пагинацией и сортировкой
    const articlesResult = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: articles.content,
        imageUrl: articles.imageUrl,
        slug: articles.slug,
        authorId: articles.authorId,
        categoryId: articles.categoryId,
        published: articles.published,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt
      })
      .from(articles)
      .where(whereClause)
      .orderBy(sortOrder === SortOrder.DESC ? desc(orderByColumn) : asc(orderByColumn))
      .limit(limit)
      .offset(offset)

    // Получаем информацию об авторах
    const authorIds = articlesResult.map((article) => article.authorId).filter(Boolean)
    const authors = authorIds.length
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(sql`${users.id} IN (${authorIds.join(',')})`)
      : []

    // Получаем информацию о категориях
    const categoryIds = articlesResult.map((article) => article.categoryId).filter(Boolean)
    const categories = categoryIds.length
      ? await db
          .select({ id: articleCategories.id, name: articleCategories.name })
          .from(articleCategories)
          .where(sql`${articleCategories.id} IN (${categoryIds.join(',')})`)
      : []

    // Добавляем имена авторов и категорий к статьям
    const articlesWithDetails = articlesResult.map((article) => ({
      ...article,
      authorName: article.authorId ? authors.find((a) => a.id === article.authorId)?.name || null : null,
      categoryName: article.categoryId ? categories.find((c) => c.id === article.categoryId)?.name || null : null
    }))

    return {
      data: articlesWithDetails,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit)
      }
    }
  }

  async findOne(id: number, isAdmin = false) {
    const conditions = [eq(articles.id, id)]

    // Если не админ, показываем только опубликованные статьи
    if (!isAdmin) {
      conditions.push(eq(articles.published, true))
    }

    const articleResult = await db
      .select()
      .from(articles)
      .where(and(...conditions))
      .limit(1)

    if (articleResult.length === 0) {
      throw new NotFoundException(`Статья с ID ${id} не найдена`)
    }

    const article = articleResult[0]

    // Получаем информацию об авторе, если он есть
    let authorName: string | null = null
    if (article.authorId) {
      const authorResult = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, article.authorId))
        .limit(1)

      if (authorResult.length > 0) {
        authorName = authorResult[0].name
      }
    }

    // Получаем информацию о категории, если она есть
    let categoryName: string | null = null
    if (article.categoryId) {
      const categoryResult = await db
        .select({ name: articleCategories.name })
        .from(articleCategories)
        .where(eq(articleCategories.id, article.categoryId))
        .limit(1)

      if (categoryResult.length > 0) {
        categoryName = categoryResult[0].name
      }
    }

    return {
      ...article,
      authorName,
      categoryName
    }
  }

  async findBySlug(slug: string, isAdmin = false) {
    const conditions = [eq(articles.slug, slug)]

    // Если не админ, показываем только опубликованные статьи
    if (!isAdmin) {
      conditions.push(eq(articles.published, true))
    }

    const articleResult = await db
      .select()
      .from(articles)
      .where(and(...conditions))
      .limit(1)

    if (articleResult.length === 0) {
      throw new NotFoundException(`Статья со slug ${slug} не найдена`)
    }

    const article = articleResult[0]

    // Получаем информацию об авторе, если он есть
    let authorName: string | null = null
    if (article.authorId) {
      const authorResult = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, article.authorId))
        .limit(1)

      if (authorResult.length > 0) {
        authorName = authorResult[0].name
      }
    }

    // Получаем информацию о категории, если она есть
    let categoryName: string | null = null
    if (article.categoryId) {
      const categoryResult = await db
        .select({ name: articleCategories.name })
        .from(articleCategories)
        .where(eq(articleCategories.id, article.categoryId))
        .limit(1)

      if (categoryResult.length > 0) {
        categoryName = categoryResult[0].name
      }
    }

    return {
      ...article,
      authorName,
      categoryName
    }
  }

  async update(id: number, updateArticleDto: UpdateArticleDto) {
    // Проверяем существование статьи
    const existingArticle = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
    if (existingArticle.length === 0) {
      throw new NotFoundException(`Статья с ID ${id} не найдена`)
    }

    // Проверка на уникальность slug, если он был изменен
    if (updateArticleDto.slug && updateArticleDto.slug !== existingArticle[0].slug) {
      const duplicateSlug = await db.select().from(articles).where(eq(articles.slug, updateArticleDto.slug)).limit(1)

      if (duplicateSlug.length > 0) {
        throw new BadRequestException(`Статья с slug "${updateArticleDto.slug}" уже существует`)
      }
    }

    const updateData = {
      ...updateArticleDto,
      updatedAt: new Date()
    }

    const updatedArticle = await db.update(articles).set(updateData).where(eq(articles.id, id)).returning()

    // Получаем данные автора
    const author = updatedArticle[0].authorId
      ? await db.select({ name: users.name }).from(users).where(eq(users.id, updatedArticle[0].authorId)).limit(1)
      : []

    // Получаем данные категории, если она есть
    let categoryName: string | null = null
    if (updatedArticle[0].categoryId) {
      const categoryResult = await db
        .select({ name: articleCategories.name })
        .from(articleCategories)
        .where(eq(articleCategories.id, updatedArticle[0].categoryId))
        .limit(1)

      if (categoryResult.length > 0) {
        categoryName = categoryResult[0].name
      }
    }

    return {
      ...updatedArticle[0],
      authorName: author.length > 0 ? author[0].name : null,
      categoryName
    }
  }

  async remove(id: number) {
    // Проверяем существование статьи
    const existingArticle = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
    if (existingArticle.length === 0) {
      throw new NotFoundException(`Статья с ID ${id} не найдена`)
    }

    // Удаляем статью
    await db.delete(articles).where(eq(articles.id, id))
  }
}

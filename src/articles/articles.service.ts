import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { db } from '../db'
import { articles, users, articleCategories } from '../db/schema'
import { eq, sql, desc, asc, and, inArray, notInArray } from 'drizzle-orm'
import { CreateArticleDto, UpdateArticleDto, FindAllArticlesQueryDto, SortOrder } from './dto'
import { generateSlug } from '../common/utils/slug.utils'

@Injectable()
export class ArticlesService {
  async create(createArticleDto: CreateArticleDto, authorId: number) {
    let articleSlug = createArticleDto.slug

    if (!articleSlug) {
      // Если slug не предоставлен, генерируем его из заголовка
      articleSlug = generateSlug(createArticleDto.title)
    }

    // Проверка на уникальность slug с добавлением суффикса при необходимости
    let existingArticle = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, articleSlug))
      .limit(1)
    let counter = 1
    while (existingArticle.length > 0) {
      articleSlug = `${generateSlug(createArticleDto.title)}-${counter}`
      existingArticle = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, articleSlug))
        .limit(1)
      counter++
    }

    // Используем URL изображения из DTO
    const imageUrl = createArticleDto.imageUrl || null

    // Создаем новую статью
    const newArticle = await db
      .insert(articles)
      .values({
        title: createArticleDto.title,
        content: createArticleDto.content,
        slug: articleSlug, // Используем сгенерированный или предоставленный уникальный slug
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
      exclude,
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

    // Добавляем фильтр исключения по ID статей
    if (exclude && exclude.length > 0) {
      conditions.push(notInArray(articles.id, exclude))
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
    const authorIds = articlesResult.map((article) => article.authorId).filter((id): id is number => id !== null)
    const authors = authorIds.length
      ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds))
      : []

    // Получаем информацию о категориях
    const categoryIds = articlesResult.map((article) => article.categoryId).filter((id): id is number => id !== null)
    const categories = categoryIds.length
      ? await db
          .select({ id: articleCategories.id, name: articleCategories.name })
          .from(articleCategories)
          .where(inArray(articleCategories.id, categoryIds))
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
    // Проверяем, существует ли статья
    const existingArticle = await db.select().from(articles).where(eq(articles.id, id)).limit(1)
    if (existingArticle.length === 0) {
      throw new NotFoundException(`Статья с ID ${id} не найдена`)
    }

    let articleSlug = updateArticleDto.slug

    // Если slug не предоставлен, но обновляется заголовок, генерируем новый slug
    if (!articleSlug && updateArticleDto.title !== undefined) {
      articleSlug = generateSlug(updateArticleDto.title)
    }

    // Проверка уникальности slug (если он есть в DTO или был сгенерирован)
    if (articleSlug !== undefined) {
      let existingArticleWithSlug = await db
        .select({ id: articles.id })
        .from(articles)
        .where(and(eq(articles.slug, articleSlug), sql`${articles.id} != ${id}`))
        .limit(1)

      let counter = 1
      // Если сгенерированный/предоставленный slug уже существует и не принадлежит текущей статье
      while (existingArticleWithSlug.length > 0) {
        // Если slug был предоставлен в DTO, при дубликате выбрасываем ошибку
        if (updateArticleDto.slug !== undefined) {
          throw new BadRequestException(`Статья с slug "${updateArticleDto.slug}" уже существует`)
        }
        // Если slug был сгенерирован, добавляем суффикс и повторяем проверку
        const baseTitle = updateArticleDto.title !== undefined ? updateArticleDto.title : existingArticle[0].title
        articleSlug = `${generateSlug(baseTitle)}-${counter}`
        existingArticleWithSlug = await db
          .select({ id: articles.id })
          .from(articles)
          .where(and(eq(articles.slug, articleSlug), sql`${articles.id} != ${id}`))
          .limit(1)
        counter++
      }
    }

    // Обновляем поля, если они присутствуют в DTO
    const dataToUpdate: Partial<typeof articles.$inferInsert> = {
      ...(updateArticleDto.title !== undefined && { title: updateArticleDto.title }),
      ...(updateArticleDto.content !== undefined && { content: updateArticleDto.content }),
      ...(articleSlug !== undefined && { slug: articleSlug }), // Используем сгенерированный или предоставленный slug
      ...(updateArticleDto.categoryId !== undefined && { categoryId: updateArticleDto.categoryId || null }),
      ...(updateArticleDto.imageUrl !== undefined && { imageUrl: updateArticleDto.imageUrl || null }),
      ...(updateArticleDto.published !== undefined && { published: updateArticleDto.published }),
      updatedAt: new Date() // Устанавливаем дату обновления
    }

    // Если нет данных для обновления, возвращаем текущую статью
    if (Object.keys(dataToUpdate).length === 0) {
      return this.findOne(id) // findOne возвращает статью с деталями автора/категории
    }

    const result = await db.update(articles).set(dataToUpdate).where(eq(articles.id, id)).returning()

    if (result.length === 0) {
      // Эта ситуация маловероятна, если existingArticle найдена
      throw new NotFoundException(`Статья с ID ${id} не удалось обновить`)
    }

    // Возвращаем обновленную статью с деталями автора/категории
    return this.findOne(id)
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

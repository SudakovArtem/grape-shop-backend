import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { db } from '../db'
import { articleCategories, articles } from '../db/schema'
import { eq, sql, count } from 'drizzle-orm'
import { CreateArticleCategoryDto, UpdateArticleCategoryDto } from './dto'

@Injectable()
export class ArticleCategoriesService {
  async create(createArticleCategoryDto: CreateArticleCategoryDto) {
    // Проверка на уникальность slug
    const existingCategory = await db
      .select()
      .from(articleCategories)
      .where(eq(articleCategories.slug, createArticleCategoryDto.slug))
      .limit(1)

    if (existingCategory.length > 0) {
      throw new BadRequestException(`Категория с slug "${createArticleCategoryDto.slug}" уже существует`)
    }

    // Создаем новую категорию
    const newCategory = await db
      .insert(articleCategories)
      .values({
        name: createArticleCategoryDto.name,
        slug: createArticleCategoryDto.slug,
        createdAt: new Date()
      })
      .returning()

    return newCategory[0]
  }

  async findAll() {
    // Получаем все категории с количеством статей в каждой
    const categoriesWithCount = await db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        articlesCount: count(articles.id).as('articlesCount')
      })
      .from(articleCategories)
      .leftJoin(articles, eq(articleCategories.id, articles.categoryId))
      .groupBy(articleCategories.id)
      .orderBy(articleCategories.name)

    return categoriesWithCount
  }

  async findOne(id: number) {
    const categoryResult = await db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        articlesCount: count(articles.id).as('articlesCount')
      })
      .from(articleCategories)
      .leftJoin(articles, eq(articleCategories.id, articles.categoryId))
      .where(eq(articleCategories.id, id))
      .groupBy(articleCategories.id)
      .limit(1)

    if (categoryResult.length === 0) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`)
    }

    return categoryResult[0]
  }

  async findBySlug(slug: string) {
    const categoryResult = await db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        createdAt: articleCategories.createdAt,
        articlesCount: count(articles.id).as('articlesCount')
      })
      .from(articleCategories)
      .leftJoin(articles, eq(articleCategories.id, articles.categoryId))
      .where(eq(articleCategories.slug, slug))
      .groupBy(articleCategories.id)
      .limit(1)

    if (categoryResult.length === 0) {
      throw new NotFoundException(`Категория со slug ${slug} не найдена`)
    }

    return categoryResult[0]
  }

  async update(id: number, updateArticleCategoryDto: UpdateArticleCategoryDto) {
    // Проверяем существование категории
    const existingCategory = await db.select().from(articleCategories).where(eq(articleCategories.id, id)).limit(1)

    if (existingCategory.length === 0) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`)
    }

    // Проверка на уникальность slug, если он был изменен
    if (updateArticleCategoryDto.slug && updateArticleCategoryDto.slug !== existingCategory[0].slug) {
      const duplicateSlug = await db
        .select()
        .from(articleCategories)
        .where(eq(articleCategories.slug, updateArticleCategoryDto.slug))
        .limit(1)

      if (duplicateSlug.length > 0) {
        throw new BadRequestException(`Категория с slug "${updateArticleCategoryDto.slug}" уже существует`)
      }
    }

    // Обновляем категорию
    const updatedCategory = await db
      .update(articleCategories)
      .set(updateArticleCategoryDto)
      .where(eq(articleCategories.id, id))
      .returning()

    // Получаем количество статей в категории
    const articlesCountResult = await db.select({ count: count() }).from(articles).where(eq(articles.categoryId, id))

    return {
      ...updatedCategory[0],
      articlesCount: Number(articlesCountResult[0].count)
    }
  }

  async remove(id: number) {
    // Проверяем существование категории
    const existingCategory = await db.select().from(articleCategories).where(eq(articleCategories.id, id)).limit(1)

    if (existingCategory.length === 0) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`)
    }

    // Проверяем, используется ли категория в статьях
    const articlesWithCategory = await db.select({ count: count() }).from(articles).where(eq(articles.categoryId, id))

    if (Number(articlesWithCategory[0].count) > 0) {
      throw new BadRequestException(
        `Невозможно удалить категорию, так как она используется в ${articlesWithCategory[0].count} статьях`
      )
    }

    // Удаляем категорию
    await db.delete(articleCategories).where(eq(articleCategories.id, id))
  }
}

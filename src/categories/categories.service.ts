import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { DRIZZLE_PROVIDER_TOKEN } from '../db/constants'
import { db } from '../db'
import { categories, products } from '../db/schema' // products нужен для проверки при удалении
import { eq } from 'drizzle-orm'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

export type DrizzleDB = typeof db

@Injectable()
export class CategoriesService {
  constructor(@Inject(DRIZZLE_PROVIDER_TOKEN) private readonly drizzle: DrizzleDB) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<typeof categories.$inferSelect> {
    const existingCategory = await this.drizzle
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, createCategoryDto.name))
      .limit(1)

    if (existingCategory.length > 0) {
      throw new ConflictException(`Категория с названием "${createCategoryDto.name}" уже существует`)
    }

    const newCategory = await this.drizzle.insert(categories).values(createCategoryDto).returning()
    return newCategory[0]
  }

  async findAll(): Promise<(typeof categories.$inferSelect)[]> {
    return this.drizzle.select().from(categories)
  }

  async findOne(id: number): Promise<typeof categories.$inferSelect> {
    const category = await this.drizzle.select().from(categories).where(eq(categories.id, id)).limit(1)
    if (category.length === 0) {
      throw new NotFoundException(`Категория с ID ${id} не найдена`)
    }
    return category[0]
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<typeof categories.$inferSelect> {
    // Проверяем, существует ли категория с таким ID
    const categoryToUpdate = await this.findOne(id) // findOne выбросит NotFoundException если нет

    // Если передано новое имя, проверяем, не занято ли оно другой категорией
    if (updateCategoryDto.name && updateCategoryDto.name !== categoryToUpdate.name) {
      const existingCategoryWithName = await this.drizzle
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.name, updateCategoryDto.name))
        .limit(1)
      if (existingCategoryWithName.length > 0) {
        throw new ConflictException(`Категория с названием "${updateCategoryDto.name}" уже существует`)
      }
    }

    const updatedCategory = await this.drizzle
      .update(categories)
      .set(updateCategoryDto)
      .where(eq(categories.id, id))
      .returning()
    return updatedCategory[0]
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id) // Проверка на существование категории

    // Проверка, есть ли продукты в этой категории
    const relatedProducts = await this.drizzle
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1)

    if (relatedProducts.length > 0) {
      throw new ConflictException(
        `Категория с ID ${id} не может быть удалена, так как содержит продукты. Сначала переместите или удалите продукты.`
      )
    }

    await this.drizzle.delete(categories).where(eq(categories.id, id))
  }
}

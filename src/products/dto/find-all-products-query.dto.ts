import { Type, Transform } from 'class-transformer'
import { IsOptional, IsInt, Min, Max, IsString, IsNumber, IsIn, IsEnum, IsArray } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

// Допустимые значения для полей фильтрации (можно вынести в константы или enum)
const VALID_MATURATION_PERIODS = ['Ультраранний', 'Очень ранний', 'Ранний', 'Ранне-средний', 'Средний', 'Не указан'] // Пример
const VALID_BERRY_SHAPES = ['Овальная', 'Пальцевидная', 'Удлиненная', 'Яйцевидная', 'Круглая'] // Пример
const VALID_COLORS = [
  'Желтый',
  'Красный',
  'Розово-красный',
  'Темно-красный',
  'Темный',
  'Белый',
  'Бело-розовый',
  'Желто-розовый',
  'Розовый'
] // Пример
const VALID_TASTES = ['Гармоничный', 'Мускатный', 'Легкий мускат', 'Фруктовый'] // Пример

export enum ProductSortBy {
  CreatedAtDesc = 'createdAt_desc',
  CreatedAtAsc = 'createdAt_asc',
  NameAsc = 'name_asc',
  NameDesc = 'name_desc',
  PriceAsc = 'price_asc', // Для примера, позже уточним логику цены
  PriceDesc = 'price_desc' // Для примера, позже уточним логику цены
}

export class FindAllProductsQueryDto {
  // Пагинация
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть целым числом' })
  @Min(1, { message: 'Номер страницы должен быть не меньше 1' })
  page?: number = 1

  @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть целым числом' })
  @Min(1, { message: 'Лимит должен быть не меньше 1' })
  @Max(100, { message: 'Лимит не может превышать 100' }) // Ограничение на максимальный лимит
  limit?: number = 10

  // Фильтры
  @ApiPropertyOptional({ description: 'ID категории', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID категории должен быть целым числом' })
  categoryId?: number

  @ApiPropertyOptional({
    description: 'ID продуктов для исключения из результатов (может быть массивом)',
    type: 'number',
    isArray: true,
    example: [1, 5, 10]
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((v) => Number(v))
    }
    return [Number(value)]
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true, message: 'ID для исключения должен быть целым числом' })
  exclude?: number[]

  @ApiPropertyOptional({ description: 'Минимальная цена', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Минимальная цена должна быть числом' })
  @Min(0, { message: 'Минимальная цена не может быть отрицательной' })
  minPrice?: number

  @ApiPropertyOptional({ description: 'Максимальная цена', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Максимальная цена должна быть числом' })
  @Min(0, { message: 'Максимальная цена не может быть отрицательной' })
  maxPrice?: number

  @ApiPropertyOptional({ description: 'Сорт', type: String })
  @IsOptional()
  @IsString({ message: 'Сорт должен быть строкой' })
  variety?: string

  @ApiPropertyOptional({
    description: 'Срок созревания (может быть массивом)',
    enum: VALID_MATURATION_PERIODS,
    type: [String],
    isArray: true,
    example: ['Ранний', 'Средний']
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]) as string[])
  @IsArray()
  @IsIn(VALID_MATURATION_PERIODS, { each: true, message: 'Недопустимый срок созревания' })
  maturationPeriod?: string[]

  @ApiPropertyOptional({
    description: 'Форма ягоды (может быть массивом)',
    enum: VALID_BERRY_SHAPES,
    type: [String],
    isArray: true,
    example: ['Овальная', 'Пальцевидная']
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]) as string[])
  @IsArray()
  @IsIn(VALID_BERRY_SHAPES, { each: true, message: 'Недопустимая форма ягоды' })
  berryShape?: string[]

  @ApiPropertyOptional({
    description: 'Цвет (может быть массивом)',
    enum: VALID_COLORS,
    type: [String],
    isArray: true,
    example: ['Желтый', 'Красный']
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]) as string[])
  @IsArray()
  @IsIn(VALID_COLORS, { each: true, message: 'Недопустимый цвет' })
  color?: string[]

  @ApiPropertyOptional({
    description: 'Вкус (может быть массивом)',
    enum: VALID_TASTES,
    type: [String],
    isArray: true,
    example: ['Гармоничный', 'Мускатный']
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]) as string[])
  @IsArray()
  @IsIn(VALID_TASTES, { each: true, message: 'Недопустимый вкус' })
  taste?: string[]

  @ApiPropertyOptional({ description: 'Минимальное количество черенков в наличии', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Минимальное количество черенков должно быть целым числом' })
  @Min(0, { message: 'Минимальное количество черенков не может быть отрицательным' })
  minCuttingInStock?: number

  @ApiPropertyOptional({ description: 'Минимальное количество саженцев в наличии', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Минимальное количество саженцев должно быть целым числом' })
  @Min(0, { message: 'Минимальное количество саженцев не может быть отрицательным' })
  minSeedlingInStock?: number

  // Поиск по ключевым словам
  @ApiPropertyOptional({ description: 'Поисковый запрос', type: String })
  @IsOptional()
  @IsString()
  search?: string

  // Сортировка
  @ApiPropertyOptional({
    description: 'Поле для сортировки',
    enum: ProductSortBy,
    default: ProductSortBy.CreatedAtDesc
  })
  @IsOptional()
  @IsEnum(ProductSortBy, { message: 'Недопустимое значение для sortBy' })
  sortBy?: ProductSortBy = ProductSortBy.CreatedAtDesc // Значение по умолчанию
}

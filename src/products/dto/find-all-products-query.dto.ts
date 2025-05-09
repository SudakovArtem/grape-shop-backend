import { Type } from 'class-transformer'
import { IsOptional, IsInt, Min, Max, IsString, IsNumber, IsIn, IsEnum } from 'class-validator'

// Допустимые значения для полей фильтрации (можно вынести в константы или enum)
const VALID_MATURATION_PERIODS = ['Ран.', 'Ультр.', 'Ср.', 'Поздн.'] // Пример
const VALID_BERRY_SHAPES = ['Пальч.', 'Овал.', 'Кругл.'] // Пример
const VALID_COLORS = ['Желт.', 'Красн.', 'Син.', 'Розов.'] // Пример
const VALID_TASTES = ['Гарм.', 'Муск.', 'Прост.'] // Пример

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
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть целым числом' })
  @Min(1, { message: 'Номер страницы должен быть не меньше 1' })
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть целым числом' })
  @Min(1, { message: 'Лимит должен быть не меньше 1' })
  @Max(100, { message: 'Лимит не может превышать 100' }) // Ограничение на максимальный лимит
  limit?: number = 10

  // Фильтры
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID категории должен быть целым числом' })
  categoryId?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Минимальная цена должна быть числом' })
  @Min(0, { message: 'Минимальная цена не может быть отрицательной' })
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Максимальная цена должна быть числом' })
  @Min(0, { message: 'Максимальная цена не может быть отрицательной' })
  maxPrice?: number

  @IsOptional()
  @IsString({ message: 'Сорт должен быть строкой' })
  variety?: string

  @IsOptional()
  @IsIn(VALID_MATURATION_PERIODS, { message: 'Недопустимый срок созревания' })
  maturationPeriod?: string

  @IsOptional()
  @IsIn(VALID_BERRY_SHAPES, { message: 'Недопустимая форма ягоды' })
  berryShape?: string

  @IsOptional()
  @IsIn(VALID_COLORS, { message: 'Недопустимый цвет' })
  color?: string

  @IsOptional()
  @IsIn(VALID_TASTES, { message: 'Недопустимый вкус' })
  taste?: string

  // Поиск по ключевым словам
  @IsOptional()
  @IsString()
  search?: string

  // Сортировка
  @IsOptional()
  @IsEnum(ProductSortBy, { message: 'Недопустимое значение для sortBy' })
  sortBy?: ProductSortBy = ProductSortBy.CreatedAtDesc // Значение по умолчанию
}

import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsOptional, IsString, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator'

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class FindAllArticlesQueryDto {
  @ApiProperty({
    description: 'Номер страницы для пагинации',
    required: false,
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiProperty({
    description: 'Количество элементов на странице',
    required: false,
    default: 10,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10

  @ApiProperty({
    description: 'Поисковый запрос (поиск по заголовку и содержимому)',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    description: 'Фильтр по статусу публикации (только для админов)',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  published?: boolean

  @ApiProperty({
    description: 'ID категории для фильтрации статей',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @ApiProperty({
    description: 'Поле для сортировки (по умолчанию createdAt)',
    required: false,
    default: 'createdAt',
    enum: ['createdAt', 'title', 'updatedAt']
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'

  @ApiProperty({
    description: 'Порядок сортировки',
    required: false,
    default: SortOrder.DESC,
    enum: SortOrder
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC
}

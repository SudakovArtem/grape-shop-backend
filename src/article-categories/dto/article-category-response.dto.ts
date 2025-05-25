import { ApiProperty } from '@nestjs/swagger'

export class ArticleCategoryResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор категории',
    example: 1
  })
  id: number

  @ApiProperty({
    description: 'Название категории статей',
    example: 'Советы по выращиванию'
  })
  name: string

  @ApiProperty({
    description: 'URL-дружественный slug для категории',
    example: 'sovety-po-vyraschivaniyu'
  })
  slug: string

  @ApiProperty({
    description: 'Дата создания категории',
    example: '2023-09-10T15:30:45.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Количество статей в категории',
    example: 5,
    required: false
  })
  articlesCount?: number
}

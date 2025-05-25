import { ApiProperty } from '@nestjs/swagger'

export class ArticleResponseDto {
  @ApiProperty({
    description: 'Уникальный идентификатор статьи',
    example: 1
  })
  id: number

  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Как выращивать виноград в домашних условиях'
  })
  title: string

  @ApiProperty({
    description: 'Содержание статьи в формате HTML',
    example: '<p>Подробная инструкция по выращиванию винограда...</p>'
  })
  content: string

  @ApiProperty({
    description: 'URL изображения статьи',
    example: 'https://grape-shop-bucket.s3.eu-central-1.amazonaws.com/article-images/grape-growing.jpg',
    required: false
  })
  imageUrl: string | null

  @ApiProperty({
    description: 'URL-дружественный slug для статьи',
    example: 'kak-vyraschivat-vinograd-v-domashnih-usloviyah'
  })
  slug: string

  @ApiProperty({
    description: 'Идентификатор автора статьи',
    example: 1,
    required: false
  })
  authorId: number | null

  @ApiProperty({
    description: 'Имя автора статьи',
    example: 'Иван Виноградов',
    required: false
  })
  authorName: string | null

  @ApiProperty({
    description: 'Идентификатор категории статьи',
    example: 2,
    required: false
  })
  categoryId: number | null

  @ApiProperty({
    description: 'Название категории статьи',
    example: 'Советы по выращиванию',
    required: false
  })
  categoryName: string | null

  @ApiProperty({
    description: 'Флаг публикации статьи',
    example: true
  })
  published: boolean

  @ApiProperty({
    description: 'Дата создания статьи',
    example: '2023-09-10T15:30:45.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Дата последнего обновления статьи',
    example: '2023-09-15T10:20:30.000Z'
  })
  updatedAt: Date
}

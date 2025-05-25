import { ApiProperty } from '@nestjs/swagger'
import { ArticleResponseDto } from './article-response.dto'

export class PaginatedArticleResponseDto {
  @ApiProperty({
    description: 'Массив статей',
    type: [ArticleResponseDto]
  })
  data: ArticleResponseDto[]

  @ApiProperty({
    description: 'Общее количество статей',
    example: 100
  })
  total: number

  @ApiProperty({
    description: 'Текущая страница',
    example: 1
  })
  page: number

  @ApiProperty({
    description: 'Количество статей на странице',
    example: 10
  })
  limit: number

  @ApiProperty({
    description: 'Общее количество страниц',
    example: 10
  })
  pageCount: number
}

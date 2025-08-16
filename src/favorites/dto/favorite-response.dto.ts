import { ApiProperty } from '@nestjs/swagger'

export class FavoriteResponseDto {
  @ApiProperty({
    description: 'ID записи в избранном',
    example: 1
  })
  id: number

  @ApiProperty({
    description: 'ID продукта',
    example: 1
  })
  productId: number

  @ApiProperty({
    description: 'Название продукта',
    example: 'Мускат Белый'
  })
  productName: string

  @ApiProperty({
    description: 'Slug продукта для формирования URL',
    example: 'muskat-belyy'
  })
  productSlug: string

  @ApiProperty({
    description: 'Описание продукта',
    example: 'Отличный сорт винограда...',
    nullable: true
  })
  productDescription?: string | null

  @ApiProperty({
    description: 'Цена черенков',
    example: 150.0,
    nullable: true
  })
  cuttingPrice?: number | null

  @ApiProperty({
    description: 'Цена саженцев',
    example: 300.0,
    nullable: true
  })
  seedlingPrice?: number | null

  @ApiProperty({
    description: 'URL главного изображения продукта',
    example: 'https://example.com/image.jpg',
    nullable: true
  })
  imageUrl?: string | null

  @ApiProperty({
    description: 'Форма ягод',
    example: 'овальная',
    nullable: true
  })
  berryShape?: string | null

  @ApiProperty({
    description: 'Цвет ягод',
    example: 'белый',
    nullable: true
  })
  color?: string | null

  @ApiProperty({
    description: 'Вкус ягод',
    example: 'мускатный',
    nullable: true
  })
  taste?: string | null

  @ApiProperty({
    description: 'Сорт винограда',
    example: 'Мускат Белый',
    nullable: true
  })
  variety?: string | null

  @ApiProperty({
    description: 'Количество черенков в наличии',
    example: 10,
    nullable: true
  })
  cuttingInStock?: number | null

  @ApiProperty({
    description: 'Количество саженцев в наличии',
    example: 5,
    nullable: true
  })
  seedlingInStock?: number | null

  @ApiProperty({
    description: 'Дата добавления в избранное',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date
}

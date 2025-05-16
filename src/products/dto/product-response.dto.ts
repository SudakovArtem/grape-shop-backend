import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class ProductImageDto {
  @ApiProperty({ description: 'ID изображения', type: Number })
  id: number

  @ApiProperty({ description: 'URL изображения', type: String })
  url: string
}

export class ProductResponseDto {
  @ApiProperty({ description: 'ID продукта', type: Number })
  id: number

  @ApiProperty({ description: 'Название продукта', type: String })
  name: string

  @ApiPropertyOptional({ description: 'Описание продукта', type: String, nullable: true })
  description?: string | null

  @ApiPropertyOptional({ description: 'Цена за черенок', type: Number, nullable: true })
  cuttingPrice?: number | null // В схеме decimal, в DTO лучше использовать number

  @ApiPropertyOptional({ description: 'Цена за саженец', type: Number, nullable: true })
  seedlingPrice?: number | null // В схеме decimal, в DTO лучше использовать number

  @ApiPropertyOptional({ description: 'ID категории', type: Number, nullable: true })
  categoryId?: number | null

  @ApiPropertyOptional({ description: 'Название категории', type: String, nullable: true })
  categoryName?: string | null // Добавлено на основе метода findOne в сервисе

  @ApiPropertyOptional({ description: 'Сорт', type: String, nullable: true })
  variety?: string | null

  @ApiPropertyOptional({ description: 'Срок созревания', type: String, nullable: true })
  maturationPeriod?: string | null

  @ApiPropertyOptional({ description: 'Форма ягоды', type: String, nullable: true })
  berryShape?: string | null

  @ApiPropertyOptional({ description: 'Цвет ягоды', type: String, nullable: true })
  color?: string | null

  @ApiPropertyOptional({ description: 'Вкус', type: String, nullable: true })
  taste?: string | null

  @ApiPropertyOptional({ description: 'В наличии', type: Boolean, default: true, nullable: true })
  inStock?: boolean | null

  @ApiProperty({ description: 'Дата создания', type: Date })
  createdAt: Date

  @ApiProperty({ description: 'Дата обновления', type: Date })
  updatedAt: Date

  @ApiPropertyOptional({ description: 'Список изображений продукта', type: () => [ProductImageDto] })
  images?: ProductImageDto[]
}

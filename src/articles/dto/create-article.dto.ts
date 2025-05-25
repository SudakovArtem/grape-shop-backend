import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, IsNumber, IsInt, IsUrl } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateArticleDto {
  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Как выращивать виноград в домашних условиях'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string

  @ApiProperty({
    description: 'Содержание статьи в формате HTML',
    example: '<p>Подробная инструкция по выращиванию винограда...</p>'
  })
  @IsString()
  @IsNotEmpty()
  content: string

  @ApiProperty({
    description: 'URL-дружественный slug для статьи',
    example: 'kak-vyraschivat-vinograd-v-domashnih-usloviyah'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string

  @ApiProperty({
    description: 'ID категории статьи',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @ApiProperty({
    description: 'URL изображения статьи',
    example: 'https://example.com/images/grape-growing.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'Некорректный URL изображения' })
  @IsString()
  imageUrl?: string

  @ApiProperty({
    description: 'Флаг публикации статьи',
    example: true,
    required: false,
    default: true
  })
  @IsBoolean()
  @IsOptional()
  published?: boolean
}

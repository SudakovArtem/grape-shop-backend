import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsOptional, IsBoolean, MaxLength, IsInt, IsUrl } from 'class-validator'
import { PartialType } from '@nestjs/mapped-types'
import { CreateArticleDto } from './create-article.dto'
import { Type } from 'class-transformer'

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiProperty({
    description: 'Заголовок статьи',
    example: 'Как выращивать виноград в домашних условиях',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string

  @ApiProperty({
    description: 'Содержание статьи в формате HTML',
    example: '<p>Подробная инструкция по выращиванию винограда...</p>',
    required: false
  })
  @IsString()
  @IsOptional()
  content?: string

  @ApiProperty({
    description: 'URL-дружественный slug для статьи',
    example: 'kak-vyraschivat-vinograd-v-domashnih-usloviyah',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string

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
    required: false
  })
  @IsBoolean()
  @IsOptional()
  published?: boolean
}

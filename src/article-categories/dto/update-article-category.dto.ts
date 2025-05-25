import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { PartialType } from '@nestjs/mapped-types'
import { CreateArticleCategoryDto } from './create-article-category.dto'

export class UpdateArticleCategoryDto extends PartialType(CreateArticleCategoryDto) {
  @ApiProperty({
    description: 'Название категории статей',
    example: 'Советы по выращиванию',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string

  @ApiProperty({
    description: 'URL-дружественный slug для категории',
    example: 'sovety-po-vyraschivaniyu',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string
}

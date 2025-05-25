import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class CreateArticleCategoryDto {
  @ApiProperty({
    description: 'Название категории статей',
    example: 'Советы по выращиванию'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string

  @ApiProperty({
    description: 'URL-дружественный slug для категории',
    example: 'sovety-po-vyraschivaniyu'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string
}

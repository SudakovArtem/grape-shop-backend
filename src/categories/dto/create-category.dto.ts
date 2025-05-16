import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCategoryDto {
  @ApiProperty({ description: 'Название категории', example: 'Столовые сорта', type: String, maxLength: 255 })
  @IsString({ message: 'Название категории должно быть строкой' })
  @IsNotEmpty({ message: 'Название категории не может быть пустым' })
  @MaxLength(255, { message: 'Название категории не может превышать 255 символов' })
  name: string
}

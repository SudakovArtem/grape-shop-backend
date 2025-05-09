import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class CreateCategoryDto {
  @IsString({ message: 'Название категории должно быть строкой' })
  @IsNotEmpty({ message: 'Название категории не может быть пустым' })
  @MaxLength(255, { message: 'Название категории не может превышать 255 символов' })
  name: string
}

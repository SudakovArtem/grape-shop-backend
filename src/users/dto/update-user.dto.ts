import { IsOptional, IsString, MaxLength, IsPhoneNumber, IsUrl } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Иван Иванов', description: 'Имя пользователя' })
  @IsOptional()
  @IsString({ message: 'Имя должно быть строкой' })
  @MaxLength(255, { message: 'Имя не может быть длиннее 255 символов' })
  name?: string

  @ApiPropertyOptional({ example: 'ул. Примерная, д. 1, кв. 2', description: 'Адрес доставки' })
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string

  @ApiPropertyOptional({ example: '+79001234567', description: 'Номер телефона' })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: 'Некорректный номер телефона' }) // Заменено null на undefined
  phone?: string

  @ApiPropertyOptional({
    description: 'URL аватара пользователя. Должен быть валидным URL изображения, полученным через эндпоинт /uploads.',
    example: 'https://storage.yandexcloud.net/your-bucket/user-uploads/avatar.jpg'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  avatar?: string
}

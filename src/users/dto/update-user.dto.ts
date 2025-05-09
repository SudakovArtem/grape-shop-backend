import { IsOptional, IsString, MaxLength, IsPhoneNumber } from 'class-validator'
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
}

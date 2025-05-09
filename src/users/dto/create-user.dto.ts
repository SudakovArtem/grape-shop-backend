import { IsEmail, IsString, MinLength, IsOptional, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email не может быть пустым' })
  email: string

  @ApiProperty({ example: 'password123', description: 'Пароль (минимум 6 символов)' })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  @IsNotEmpty({ message: 'Пароль не может быть пустым' })
  password: string

  @ApiProperty({ example: 'Иван Иванов', description: 'Имя пользователя' })
  @IsString({ message: 'Имя должно быть строкой' })
  @IsNotEmpty({ message: 'Имя не может быть пустым' }) // Если имя обязательно
  name: string // Добавлено

  @ApiPropertyOptional({ example: 'ул. Примерная, д. 1, кв. 2', description: 'Адрес доставки' })
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string // Добавлено как опциональное

  @ApiPropertyOptional({ example: '+79001234567', description: 'Номер телефона' })
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' }) // Можно добавить более строгую валидацию телефона
  phone?: string // Добавлено как опциональное
}

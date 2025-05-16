import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserResponseDto {
  @ApiProperty({ description: 'ID пользователя', type: Number })
  id: number

  @ApiProperty({ description: 'Email пользователя', type: String, example: 'user@example.com' })
  email: string

  @ApiPropertyOptional({ description: 'Имя пользователя', type: String, example: 'Иван Иванов', nullable: true })
  name?: string | null

  @ApiPropertyOptional({
    description: 'Адрес пользователя',
    type: String,
    example: 'ул. Примерная, д.1',
    nullable: true
  })
  address?: string | null

  @ApiPropertyOptional({ description: 'Телефон пользователя', type: String, example: '+79001234567', nullable: true })
  phone?: string | null

  @ApiPropertyOptional({
    description: 'URL аватара пользователя',
    type: String,
    nullable: true,
    example: 'https://example.com/avatar.jpg'
  })
  avatar?: string | null

  @ApiProperty({ description: 'Роль пользователя', enum: ['user', 'admin'], example: 'user' })
  role: string

  @ApiProperty({ description: 'Дата регистрации пользователя', type: Date, nullable: true })
  createdAt: Date | null
}

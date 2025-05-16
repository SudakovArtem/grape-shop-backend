import { ApiProperty } from '@nestjs/swagger'

export class AuthenticatedUserDto {
  @ApiProperty({ description: 'ID аутентифицированного пользователя', type: Number })
  id: number

  @ApiProperty({ description: 'Email аутентифицированного пользователя', type: String, example: 'user@example.com' })
  email: string

  @ApiProperty({ description: 'Роль аутентифицированного пользователя', enum: ['user', 'admin'], example: 'user' })
  role: string
}

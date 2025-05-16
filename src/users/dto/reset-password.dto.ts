import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordDto {
  @ApiProperty({ description: 'Токен для сброса пароля, полученный по email' })
  @IsString()
  @IsNotEmpty({ message: 'Токен не может быть пустым' })
  token: string

  @ApiProperty({ example: 'newSecurePassword123', description: 'Новый пароль (минимум 8 символов)' })
  @IsString()
  @IsNotEmpty({ message: 'Новый пароль не может быть пустым' })
  @MinLength(8, { message: 'Пароль должен содержать не менее 8 символов' })
  @MaxLength(100, { message: 'Пароль не может быть длиннее 100 символов' })
  // TODO: Добавить более сложные правила валидации пароля, если требуется (например, @Matches)
  newPassword: string
}

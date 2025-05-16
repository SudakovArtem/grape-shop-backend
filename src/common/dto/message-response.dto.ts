import { ApiProperty } from '@nestjs/swagger'

export class MessageResponseDto {
  @ApiProperty({ description: 'Сообщение от сервера', example: 'Операция успешно выполнена.' })
  message: string
}

import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePaymentRequestDto {
  @ApiProperty({
    example: '1000.00',
    description: 'Сумма платежа в рублях'
  })
  @IsString({ message: 'Сумма должна быть строкой' })
  @IsNotEmpty({ message: 'Сумма не может быть пустой' })
  value: string

  @ApiProperty({
    example: 'order-123',
    description: 'Идентификатор заказа'
  })
  @IsString({ message: 'ID заказа должен быть строкой' })
  @IsNotEmpty({ message: 'ID заказа не может быть пустым' })
  orderId: string

  @ApiProperty({
    example: 'user-456',
    description: 'Идентификатор пользователя'
  })
  @IsString({ message: 'ID пользователя должен быть строкой' })
  @IsNotEmpty({ message: 'ID пользователя не может быть пустым' })
  userId: string
}

import { ApiProperty } from '@nestjs/swagger'
import { PaymentObjectDto } from './payment-object.dto'

export class CreatePaymentResponseDto {
  @ApiProperty({
    type: PaymentObjectDto,
    description: 'Объект платежа от YooKassa'
  })
  payment: PaymentObjectDto
}

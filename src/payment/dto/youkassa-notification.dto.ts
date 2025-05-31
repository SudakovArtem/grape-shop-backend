import { IsString, IsIn, IsNotEmpty, ValidateNested } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { PaymentObjectDto } from './payment-object.dto'

export class YooKassaNotificationDto {
  @ApiProperty({
    example: 'notification',
    description: 'Тип события'
  })
  @IsString({ message: 'Тип должен быть строкой' })
  @IsIn(['notification'], { message: 'Некорректный тип уведомления' })
  type: 'notification'

  @ApiProperty({
    example: 'payment.succeeded',
    description: 'Событие платежа',
    enum: ['payment.succeeded', 'payment.waiting_for_capture', 'payment.canceled', 'refund.succeeded']
  })
  @IsString({ message: 'Событие должно быть строкой' })
  @IsIn(['payment.succeeded', 'payment.waiting_for_capture', 'payment.canceled', 'refund.succeeded'], {
    message: 'Некорректное событие'
  })
  event: 'payment.succeeded' | 'payment.waiting_for_capture' | 'payment.canceled' | 'refund.succeeded'

  @ApiProperty({
    type: PaymentObjectDto,
    description: 'Объект платежа'
  })
  @ValidateNested()
  @Type(() => PaymentObjectDto)
  @IsNotEmpty({ message: 'Объект платежа не может быть пустым' })
  object: PaymentObjectDto
}

import { Type } from 'class-transformer'
import { IsInt, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Новое количество товара в корзине', type: Number, minimum: 1, example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'quantity должно быть целым числом' })
  @Min(1, { message: 'quantity должен быть не меньше 1' })
  quantity: number
}

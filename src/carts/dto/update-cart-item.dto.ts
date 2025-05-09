import { Type } from 'class-transformer'
import { IsInt, Min } from 'class-validator'

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt({ message: 'quantity должно быть целым числом' })
  @Min(1, { message: 'quantity должен быть не меньше 1' })
  quantity: number
}

import { IsIn, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class AddItemToCartDto {
  @IsInt({ message: 'productId должен быть целым числом' })
  @IsNotEmpty({ message: 'productId не может быть пустым' })
  productId: number

  @IsIn(['cutting', 'seedling'], { message: 'type должен быть "cutting" или "seedling"' })
  @IsNotEmpty({ message: 'type не может быть пустым' })
  type: 'cutting' | 'seedling'

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'quantity должно быть целым числом' })
  @Min(1, { message: 'quantity должен быть не меньше 1' })
  quantity?: number = 1 // По умолчанию 1
}

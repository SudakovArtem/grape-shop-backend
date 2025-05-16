import { IsIn, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AddItemToCartDto {
  @ApiProperty({ description: 'ID продукта для добавления в корзину', type: Number, example: 1 })
  @IsInt({ message: 'productId должен быть целым числом' })
  @IsNotEmpty({ message: 'productId не может быть пустым' })
  productId: number

  @ApiProperty({ description: 'Тип товара (черенок или саженец)', enum: ['cutting', 'seedling'], example: 'seedling' })
  @IsIn(['cutting', 'seedling'], { message: 'type должен быть "cutting" или "seedling"' })
  @IsNotEmpty({ message: 'type не может быть пустым' })
  type: 'cutting' | 'seedling'

  @ApiPropertyOptional({ description: 'Количество товара', type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'quantity должно быть целым числом' })
  @Min(1, { message: 'quantity должен быть не меньше 1' })
  quantity?: number = 1 // По умолчанию 1
}

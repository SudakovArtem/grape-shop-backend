import { IsInt, IsPositive } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AddToFavoritesDto {
  @ApiProperty({
    description: 'ID продукта для добавления в избранное',
    example: 1
  })
  @IsInt()
  @IsPositive()
  productId: number
}

import { IsOptional, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class FindAllFavoritesQueryDto {
  @ApiPropertyOptional({ description: 'Номер страницы', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Страница должна быть целым числом' })
  @Min(1, { message: 'Номер страницы должен быть не меньше 1' })
  page?: number = 1

  @ApiPropertyOptional({ description: 'Количество элементов на странице', default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Лимит должен быть целым числом' })
  @Min(1, { message: 'Лимит должен быть не меньше 1' })
  @Max(100, { message: 'Лимит не может превышать 100' })
  limit?: number = 10
}

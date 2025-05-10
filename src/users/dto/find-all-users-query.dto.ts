import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min, Matches } from 'class-validator'

export class FindAllUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Номер страницы',
    default: 1,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({
    description: 'Количество элементов на странице',
    default: 10,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10

  @ApiPropertyOptional({
    description: 'Часть email для поиска (регистронезависимый)',
    type: String
  })
  @IsOptional()
  @IsString()
  email?: string

  @ApiPropertyOptional({
    description:
      'Поле и направление сортировки. Допустимые значения: "createdAt" (по возрастанию), "-createdAt" (по убыванию).',
    type: String,
    default: '-createdAt',
    example: '-createdAt'
  })
  @IsOptional()
  @IsString()
  @Matches(/^-?createdAt$/, {
    message: 'sortBy должен быть "createdAt" или "-createdAt".'
  })
  sortBy?: string = '-createdAt'
}

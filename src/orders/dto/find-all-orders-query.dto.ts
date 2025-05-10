import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator'
import { OrderSystemStatus } from './order-status.enum'

export class FindAllOrdersQueryDto {
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
    description: 'Количество заказов на странице',
    default: 10,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10

  @ApiPropertyOptional({
    description: 'ID пользователя для фильтрации заказов',
    type: Number,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number

  @ApiPropertyOptional({
    description: 'Фильтр по статусу заказа',
    enum: OrderSystemStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(OrderSystemStatus)
  status?: OrderSystemStatus

  @ApiPropertyOptional({
    description:
      'Поле и направление сортировки. Допустимые значения: "createdAt" (по возрастанию), "-createdAt" (по убыванию).',
    type: String,
    default: '-createdAt',
    example: '-createdAt',
    required: false
  })
  @IsOptional()
  @IsString()
  @Matches(/^-?createdAt$/, {
    message: 'sortBy должен быть "createdAt" или "-createdAt".'
  })
  sortBy?: string = '-createdAt'
}

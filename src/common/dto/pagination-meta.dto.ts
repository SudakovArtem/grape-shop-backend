import { ApiProperty } from '@nestjs/swagger'

export class PaginationMetaDto {
  @ApiProperty({ description: 'Общее количество элементов', type: Number })
  total: number

  @ApiProperty({ description: 'Текущая страница', type: Number })
  page: number

  @ApiProperty({ description: 'Количество элементов на странице', type: Number })
  limit: number

  @ApiProperty({ description: 'Последняя страница', type: Number })
  lastPage: number
}

import { ApiProperty } from '@nestjs/swagger'
import { OrderResponseDto } from './order-response.dto'
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto' // Убедитесь, что этот DTO существует и корректен

export class PaginatedOrderResponseDto {
  @ApiProperty({ type: () => [OrderResponseDto], description: 'Массив заказов для текущей страницы' })
  data: OrderResponseDto[]

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Метаданные пагинации' })
  meta: PaginationMetaDto
}

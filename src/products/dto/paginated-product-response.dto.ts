import { ApiProperty } from '@nestjs/swagger'
import { ProductResponseDto } from './product-response.dto'
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto'

export class PaginatedProductResponseDto {
  @ApiProperty({ type: () => [ProductResponseDto], description: 'Список продуктов' })
  data: ProductResponseDto[]

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Метаданные пагинации' })
  meta: PaginationMetaDto
}

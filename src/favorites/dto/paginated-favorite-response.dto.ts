import { ApiProperty } from '@nestjs/swagger'
import { FavoriteResponseDto } from './favorite-response.dto'
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto'

export class PaginatedFavoriteResponseDto {
  @ApiProperty({ type: () => [FavoriteResponseDto], description: 'Список избранных продуктов' })
  data: FavoriteResponseDto[]

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Метаданные пагинации' })
  meta: PaginationMetaDto
}

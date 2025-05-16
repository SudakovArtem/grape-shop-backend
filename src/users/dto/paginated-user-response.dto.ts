import { ApiProperty } from '@nestjs/swagger'
import { UserResponseDto } from './user-response.dto'
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto'

export class PaginatedUserResponseDto {
  @ApiProperty({ type: () => [UserResponseDto], description: 'Список пользователей' })
  data: UserResponseDto[]

  @ApiProperty({ type: () => PaginationMetaDto, description: 'Метаданные пагинации' })
  meta: PaginationMetaDto
}

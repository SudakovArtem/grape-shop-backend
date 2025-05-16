import { ApiProperty } from '@nestjs/swagger'

export class CategoryResponseDto {
  @ApiProperty({ description: 'ID категории', type: Number })
  id: number

  @ApiProperty({ description: 'Название категории', type: String })
  name: string

  @ApiProperty({ description: 'Дата создания категории', type: Date })
  createdAt: Date

  // Если в будущем в $inferSelect для категорий появится updatedAt, его можно будет добавить сюда
  // @ApiPropertyOptional({ description: 'Дата обновления категории', type: Date, nullable: true })
  // updatedAt?: Date | null;
}

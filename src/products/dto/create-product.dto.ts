import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
  ValidateIf,
  IsPositive
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @ApiProperty({ description: 'Название продукта', example: 'Виноград Кишмиш' })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({ description: 'Уникальный идентификатор продукта для URL (генерируется автоматически, если не указан)', example: 'vinograd-kishmish' })
  @IsString({ message: 'Slug должен быть строкой' })
  @IsOptional()
  @MaxLength(255)
  slug?: string

  @ApiPropertyOptional({ description: 'Описание продукта', example: 'Сладкий сорт без косточек' })
  @IsString({ message: 'Описание должно быть строкой' })
  @IsOptional()
  description?: string

  @ApiPropertyOptional({ description: 'Цена за черенок (если применимо)', example: 150.5, type: Number })
  @IsOptional()
  @ValidateIf((o: CreateProductDto) => o.cuttingPrice !== null) // Валидировать, только если не null
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Цена черенка должна быть числом с максимум 2 знаками после запятой' })
  @IsPositive()
  @Min(0, { message: 'Цена черенка не может быть отрицательной' })
  @Type(() => Number) // Для преобразования из строки, если данные приходят как multipart/form-data или query params
  cuttingPrice?: number | null

  @ApiPropertyOptional({ description: 'Цена за саженец (если применимо)', example: 300.0, type: Number })
  @IsOptional()
  @ValidateIf((o: CreateProductDto) => o.seedlingPrice !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Цена саженца должна быть числом с максимум 2 знаками после запятой' })
  @IsPositive()
  @Min(0, { message: 'Цена саженца не может быть отрицательной' })
  @Type(() => Number)
  seedlingPrice?: number | null

  @ApiPropertyOptional({ description: 'ID категории', example: 1 })
  @IsInt({ message: 'ID категории должен быть целым числом' })
  @IsNotEmpty({ message: 'ID категории не может быть пустым' })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  categoryId: number

  @ApiPropertyOptional({ description: 'Сорт (дублирует name для ТЗ)', example: 'Кишмиш' })
  @IsString({ message: 'Сорт должен быть строкой' })
  @IsOptional() // В ТЗ "дублирует name для совместимости", можно сделать обязательным или опциональным.
  // Если он всегда равен name, то его можно заполнять в сервисе, а не принимать от клиента.
  // Пока сделаем опциональным.
  @MaxLength(255)
  variety?: string

  @ApiPropertyOptional({ description: 'Срок созревания', example: 'Ранний' })
  @IsString({ message: 'Срок созревания должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  maturationPeriod?: string

  @ApiPropertyOptional({ description: 'Форма ягоды', example: 'Овальная' })
  @IsString({ message: 'Форма ягоды должна быть строкой' })
  @IsOptional()
  @MaxLength(50)
  berryShape?: string

  @ApiPropertyOptional({ description: 'Цвет ягоды', example: 'Зеленый' })
  @IsString({ message: 'Цвет должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  color?: string

  @ApiPropertyOptional({ description: 'Вкус', example: 'Сладкий' })
  @IsString({ message: 'Вкус должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  taste?: string

  @ApiPropertyOptional({ description: 'В наличии (черенок)', default: false })
  @IsBoolean({ message: 'Наличие черенков должно быть булевым значением' })
  @IsOptional()
  cuttingInStock?: boolean = false

  @ApiPropertyOptional({ description: 'В наличии (саженец)', default: false })
  @IsBoolean({ message: 'Наличие саженцев должно быть булевым значением' })
  @IsOptional()
  seedlingInStock?: boolean = false
}

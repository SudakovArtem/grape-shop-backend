import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
  MaxLength,
  IsNotEmpty,
  ValidateIf
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateProductDto {
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название не может быть пустым' })
  @MaxLength(255)
  name: string

  @IsString({ message: 'Описание должно быть строкой' })
  @IsOptional()
  description?: string

  @IsOptional()
  @ValidateIf((o: CreateProductDto) => o.cuttingPrice !== null) // Валидировать, только если не null
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Цена черенка должна быть числом с максимум 2 знаками после запятой' })
  @Min(0, { message: 'Цена черенка не может быть отрицательной' })
  @Type(() => Number) // Для преобразования из строки, если данные приходят как multipart/form-data или query params
  cuttingPrice?: number | null

  @IsOptional()
  @ValidateIf((o: CreateProductDto) => o.seedlingPrice !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Цена саженца должна быть числом с максимум 2 знаками после запятой' })
  @Min(0, { message: 'Цена саженца не может быть отрицательной' })
  @Type(() => Number)
  seedlingPrice?: number | null

  @IsInt({ message: 'ID категории должен быть целым числом' })
  @IsNotEmpty({ message: 'ID категории не может быть пустым' })
  @Type(() => Number)
  categoryId: number

  @IsString({ message: 'Сорт должен быть строкой' })
  @IsOptional() // В ТЗ "дублирует name для совместимости", можно сделать обязательным или опциональным.
  // Если он всегда равен name, то его можно заполнять в сервисе, а не принимать от клиента.
  // Пока сделаем опциональным.
  @MaxLength(255)
  variety?: string

  @IsString({ message: 'Срок созревания должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  maturationPeriod?: string

  @IsString({ message: 'Форма ягоды должна быть строкой' })
  @IsOptional()
  @MaxLength(50)
  berryShape?: string

  @IsString({ message: 'Цвет должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  color?: string

  @IsString({ message: 'Вкус должен быть строкой' })
  @IsOptional()
  @MaxLength(50)
  taste?: string

  @IsBoolean({ message: 'Наличие должно быть булевым значением' })
  @IsOptional()
  inStock?: boolean = true
}

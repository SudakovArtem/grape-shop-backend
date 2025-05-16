import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CategoryResponseDto } from './dto/category-response.dto'
import { AuthGuard } from '@nestjs/passport'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'

@ApiTags('Categories')
// @ApiBearerAuth() // Раскомментировать, если для всех методов нужна авторизация
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создать новую категорию (только для администраторов)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Категория успешно создана.', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для создания категории.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Категория с таким названием уже существует.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' }) // Если используется AuthGuard
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' }) // Если используется RolesGuard
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех категорий' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех категорий.',
    type: [CategoryResponseDto],
    isArray: true
  })
  findAll() {
    return this.categoriesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Категория найдена.', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id)
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Обновить категорию по ID (только для администраторов)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Категория успешно обновлена.', type: CategoryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для обновления категории.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена для обновления.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Категория с новым названием уже существует.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' }) // Если используется AuthGuard
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' }) // Если используется RolesGuard
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto)
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию по ID (только для администраторов)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Категория успешно удалена.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена для удаления.' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Категория не может быть удалена, так как содержит продукты.'
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' }) // Если используется AuthGuard
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' }) // Если используется RolesGuard
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.categoriesService.remove(id)
  }
}

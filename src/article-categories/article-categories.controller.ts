import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ArticleCategoriesService } from './article-categories.service'
import { CreateArticleCategoryDto, UpdateArticleCategoryDto, ArticleCategoryResponseDto } from './dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'

@ApiTags('Article Categories')
@Controller('article-categories')
export class ArticleCategoriesController {
  constructor(private readonly articleCategoriesService: ArticleCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую категорию статей (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Категория успешно создана.',
    type: ArticleCategoryResponseDto
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для создания категории.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async create(@Body() createArticleCategoryDto: CreateArticleCategoryDto) {
    return this.articleCategoriesService.create(createArticleCategoryDto)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех категорий статей' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список категорий статей.',
    type: [ArticleCategoryResponseDto]
  })
  async findAll() {
    return this.articleCategoriesService.findAll()
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Получить категорию статей по slug' })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'slug', description: 'Slug категории', example: 'sovety-po-vyraschivaniyu' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория найдена.',
    type: ArticleCategoryResponseDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким slug не найдена.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.articleCategoriesService.findBySlug(slug)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию статей по ID' })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID категории', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория найдена.',
    type: ArticleCategoryResponseDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.articleCategoriesService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить категорию статей по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID категории', example: 1 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно обновлена.',
    type: ArticleCategoryResponseDto
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для обновления категории.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateArticleCategoryDto: UpdateArticleCategoryDto) {
    return this.articleCategoriesService.update(id, updateArticleCategoryDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить категорию статей по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'ID категории', example: 1 })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Категория успешно удалена.' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Невозможно удалить категорию, так как она используется в статьях.'
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Категория с таким ID не найдена.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.articleCategoriesService.remove(id)
  }
}

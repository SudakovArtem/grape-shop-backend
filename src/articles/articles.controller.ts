import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
  Post,
  Body,
  Put,
  Delete,
  UseGuards,
  Request
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ArticlesService } from './articles.service'
import {
  CreateArticleDto,
  UpdateArticleDto,
  FindAllArticlesQueryDto,
  ArticleResponseDto,
  PaginatedArticleResponseDto
} from './dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новую статью (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Как выращивать виноград в домашних условиях' },
        content: { type: 'string', example: '<p>Подробная инструкция по выращиванию винограда...</p>' },
        slug: { type: 'string', example: 'kak-vyraschivat-vinograd-v-domashnih-usloviyah' },
        categoryId: { type: 'number', example: 1 },
        published: { type: 'boolean', example: true },
        imageUrl: { type: 'string', example: 'https://example.com/images/grape-growing.jpg' }
      },
      required: ['title', 'content', 'slug']
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Статья успешно создана.', type: ArticleResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для создания статьи.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async create(@Body() createArticleDto: CreateArticleDto, @Request() req: { user: { id: number } }) {
    // Преобразование строкового categoryId в число
    if (createArticleDto.categoryId && typeof createArticleDto.categoryId === 'string') {
      createArticleDto.categoryId = parseInt(createArticleDto.categoryId, 10)
    }

    // Преобразование строкового published в boolean
    if (createArticleDto.published !== undefined && typeof createArticleDto.published === 'string') {
      createArticleDto.published = (createArticleDto.published as string).toLowerCase() === 'true'
    }

    return this.articlesService.create(createArticleDto, req.user.id)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех статей с фильтрацией и пагинацией' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список статей с пагинацией.',
    type: PaginatedArticleResponseDto
  })
  async findAll(@Query() query: FindAllArticlesQueryDto, @Request() req: { user?: { role?: string } }) {
    // Проверяем наличие авторизованного пользователя и его роль
    const isAdmin: boolean = req.user?.role === 'admin'
    return this.articlesService.findAll(query, isAdmin)
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Получить статью по slug' })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'slug', description: 'Slug статьи', example: 'kak-vyraschivat-vinograd-v-domashnih-usloviyah' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Статья найдена.', type: ArticleResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Статья с таким slug не найдена.' })
  async findBySlug(@Param('slug') slug: string, @Request() req: { user?: { role?: string } }) {
    // Проверяем наличие авторизованного пользователя и его роль
    const isAdmin: boolean = req.user?.role === 'admin'
    return this.articlesService.findBySlug(slug, isAdmin)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить статью по ID' })
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'ID статьи', example: 1 })
  @ApiResponse({ status: HttpStatus.OK, description: 'Статья найдена.', type: ArticleResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Статья с таким ID не найдена.' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: { user?: { role?: string } }) {
    // Проверяем наличие авторизованного пользователя и его роль
    const isAdmin: boolean = req.user?.role === 'admin'
    return this.articlesService.findOne(id, isAdmin)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить статью по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Обновленный заголовок статьи' },
        content: { type: 'string', example: '<p>Обновленное содержание статьи...</p>' },
        slug: { type: 'string', example: 'obnovlennyi-slug-stati' },
        categoryId: { type: 'number', example: 1 },
        published: { type: 'boolean', example: true },
        imageUrl: { type: 'string', example: 'https://example.com/images/grape-growing.jpg' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Статья успешно обновлена.', type: ArticleResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для обновления статьи.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Статья с таким ID не найдена.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateArticleDto: UpdateArticleDto) {
    // Преобразование строкового categoryId в число
    if (updateArticleDto.categoryId && typeof updateArticleDto.categoryId === 'string') {
      updateArticleDto.categoryId = parseInt(String(updateArticleDto.categoryId), 10)
    }

    // Преобразование строкового published в boolean
    if (updateArticleDto.published !== undefined && typeof updateArticleDto.published === 'string') {
      updateArticleDto.published = String(updateArticleDto.published).toLowerCase() === 'true'
    }

    return this.articlesService.update(id, updateArticleDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить статью по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'ID статьи', example: 1 })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Статья успешно удалена.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Статья с таким ID не найдена.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.articlesService.remove(id)
  }
}

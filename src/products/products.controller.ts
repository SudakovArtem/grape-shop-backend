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
  UseInterceptors,
  UploadedFile,
  ParseBoolPipe,
  DefaultValuePipe,
  BadRequestException,
  UseGuards
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ProductsService } from './products.service'
import { FindAllProductsQueryDto } from './dto/find-all-products-query.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { ProductResponseDto } from './dto/product-response.dto'
import { PaginatedProductResponseDto } from './dto/paginated-product-response.dto'

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый продукт (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Продукт успешно создан.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для создания продукта.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto)
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех продуктов с фильтрацией и пагинацией' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список продуктов с пагинацией.',
    type: PaginatedProductResponseDto
  })
  async findAll(@Query() query: FindAllProductsQueryDto) {
    return this.productsService.findAll(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить продукт по ID' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Продукт найден.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт с таким ID не найден.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe автоматически преобразует строковый параметр :id в число и выбросит ошибку, если это не так.
    return this.productsService.findOne(id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить продукт по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Продукт успешно обновлен.', type: ProductResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Неверные данные для обновления продукта.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт с таким ID не найден.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить продукт по ID (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Продукт успешно удален.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт с таким ID не найден.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.productsService.remove(id)
  }

  @Post(':productId/images')
  @ApiOperation({ summary: 'Добавить изображение к продукту (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        imageFile: {
          type: 'string',
          format: 'binary',
          description: 'Файл изображения продукта (jpg, jpeg, png, gif, до 5MB)'
        }
      },
      required: ['imageFile']
    }
  })
  @ApiQuery({ name: 'isPrimary', required: false, type: Boolean, description: 'Сделать это изображение основным?' })
  @UseInterceptors(
    FileInterceptor('imageFile', {
      limits: { fileSize: 1024 * 1024 * 5 }, // 5MB
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException('Поддерживаются только изображения форматов: jpg, jpeg, png, gif'),
            false
          )
        }
        callback(null, true)
      }
    })
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Изображение успешно добавлено к продукту.',
    type: ProductResponseDto
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Ошибка при загрузке файла или неверный ID продукта.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async addProductImage(
    @Param('productId', ParseIntPipe) productId: number,
    @UploadedFile() file: Express.Multer.File, // Тип Express.Multer.File
    @Query('isPrimary', new DefaultValuePipe(false), ParseBoolPipe) isPrimary?: boolean
  ) {
    if (!file) {
      throw new BadRequestException('Файл изображения не был загружен или не прошел фильтрацию')
    }
    return this.productsService.addProductImage(productId, file, isPrimary)
  }

  @Delete(':productId/images/:imageId')
  @ApiOperation({ summary: 'Удалить изображение продукта (только для администраторов)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Изображение успешно удалено.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Продукт или изображение не найдено.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Пользователь не авторизован.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Недостаточно прав.' })
  async removeProductImage(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number
  ): Promise<void> {
    await this.productsService.removeProductImage(productId, imageId)
  }
}

import {
  BadRequestException,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadsService } from './uploads.service'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Загрузить файл в указанную папку (или папку по умолчанию)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    description: `Целевая папка для загрузки файла. Если не указана, используется папка по умолчанию (например, 'common-uploads'). Допустимые символы: буквы, цифры, дефис, подчеркивание. Максимальная длина: 50 символов.`,
    example: 'avatars'
  })
  @ApiBody({
    description: 'Файл для загрузки (max 5MB, типы: .png, .jpg, .jpeg, .webp)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Файл успешно загружен',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://storage.yandexcloud.net/your-bucket/folder/image.jpg' },
        fileKey: { type: 'string', example: 'folder/image.jpg' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректный запрос, файл не предоставлен, превышен размер или неверный тип файла'
  })
  @ApiResponse({ status: 401, description: 'Пользователь не авторизован' })
  @ApiResponse({ status: 500, description: 'Внутренняя ошибка сервера при загрузке файла' })
  @UseInterceptors(
    FileInterceptor('file', {
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
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Query('folder') folder?: string) {
    if (!file) {
      throw new HttpException('Файл не был предоставлен', HttpStatus.BAD_REQUEST)
    }

    const defaultFolder = 'common-uploads'
    let targetFolder = folder ? folder.trim() : defaultFolder
    const folderRegex = /^[a-zA-Z0-9_-]{1,50}$/

    if (folder && !folderRegex.test(folder)) {
      throw new HttpException(
        'Недопустимое имя папки. Используйте только буквы, цифры, дефис, подчеркивание. Макс. длина 50 символов.',
        HttpStatus.BAD_REQUEST
      )
    }
    if (!targetFolder) targetFolder = defaultFolder

    return this.uploadsService.uploadFile(file, targetFolder)
  }
}

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpException,
  HttpStatus,
  Query,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadsService } from './uploads.service'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_FILE_TYPES_REGEX = /^image\/(jpeg|png|webp)$/i

@ApiTags('uploads')
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES }),
          new FileTypeValidator({ fileType: ALLOWED_FILE_TYPES_REGEX })
        ],
        fileIsRequired: true,
        exceptionFactory: (error) => {
          throw new HttpException(
            `Ошибка валидации файла: ${error}. Допустимые типы: PNG, JPG, WEBP. Макс. размер: ${MAX_FILE_SIZE_MB}MB.`,
            HttpStatus.BAD_REQUEST
          )
        }
      })
    )
    file: Express.Multer.File,
    @Query('folder') folder?: string
  ) {
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

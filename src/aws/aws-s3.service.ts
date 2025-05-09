import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3' // Импортируем v3 (убрали PutObjectCommandOutput)
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class AwsS3Service {
  private readonly s3Client: S3Client // Новый клиент v3
  private readonly bucketName: string
  private readonly logger = new Logger(AwsS3Service.name)

  constructor(private readonly configService: ConfigService) {
    const bucketNameFromConfig = this.configService.get<string>('AWS_S3_BUCKET_NAME')
    if (!bucketNameFromConfig) {
      this.logger.error('AWS_S3_BUCKET_NAME is not defined in .env file.')
      throw new InternalServerErrorException('AWS S3 bucket name is not configured.')
    }
    this.bucketName = bucketNameFromConfig

    const region = this.configService.get<string>('AWS_REGION')
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
    const endpointUrl = this.configService.get<string>('AWS_S3_ENDPOINT_URL') // Добавлено для Yandex S3

    if (!region || !accessKeyId || !secretAccessKey) {
      // Проверка endpointUrl не обязательна здесь, если он опционален
      this.logger.error(
        'AWS S3 configuration is incomplete. Please check your .env file for region, accessKeyId, secretAccessKey.'
      )
      // Раскомментируем выброс исключения для надежности и удовлетворения типизации
      throw new InternalServerErrorException('AWS S3 configuration is incomplete.')
    }

    this.s3Client = new S3Client({
      // Создаем клиент v3
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      },
      endpoint: endpointUrl // Добавлено для Yandex S3
    })
  }

  async uploadFile(file: Express.Multer.File, folder?: string): Promise<string> {
    if (!file || !file.originalname || !file.buffer || !file.mimetype) {
      this.logger.error('UploadFile: Файл или его обязательные свойства отсутствуют.')
      throw new InternalServerErrorException('Некорректный файл для загрузки')
    }

    const originalName = file.originalname
    const fileExtension = originalName.substring(originalName.lastIndexOf('.'))
    const uniqueFileName = `${uuidv4()}${fileExtension}`
    const key = folder ? `${folder}/${uniqueFileName}` : uniqueFileName

    const command = new PutObjectCommand({
      // Новая команда v3
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
      // ACL: 'public-read', // Если нужен ACL, используется параметр ACL: 'public-read' или CannedACL.PUBLIC_READ (нужен импорт)
    })

    try {
      await this.s3Client.send(command) // Новый вызов v3
      this.logger.log(`File uploaded successfully to S3. Key: ${key}`)
      return key // Возвращаем наш сгенерированный ключ
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${(error as Error).message}`, (error as Error).stack)
      throw new InternalServerErrorException('Ошибка при загрузке файла в S3')
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      // Новая команда v3
      Bucket: this.bucketName,
      Key: fileKey
    })

    try {
      await this.s3Client.send(command) // Новый вызов v3
      this.logger.log(`File deleted successfully from S3. Key: ${fileKey}`)
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${(error as Error).message}`, (error as Error).stack)
      // Не выбрасываем ошибку наружу, если удаление не критично, или выбрасываем, если это важно
      // throw new InternalServerErrorException('Ошибка при удалении файла из S3');
    }
  }

  // Метод для получения URL файла (если ACL public-read или есть presigned URL)
  getFileUrl(fileKey: string): string {
    // Это базовый URL, если файлы публичны. Для presigned URL логика будет другой.
    const endpointUrl = this.configService.get<string>('AWS_S3_ENDPOINT_URL')
    const region = this.configService.get<string>('AWS_REGION')

    if (endpointUrl) {
      // Для Yandex S3 или другого S3-совместимого хранилища с кастомным эндпоинтом
      // Убедимся, что URL не содержит двойных слешей между эндпоинтом и бакетом.
      const endpoint = endpointUrl.endsWith('/') ? endpointUrl.slice(0, -1) : endpointUrl
      return `${endpoint}/${this.bucketName}/${fileKey}`
    } else {
      // Стандартный AWS S3 URL
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${fileKey}`
    }
  }
}

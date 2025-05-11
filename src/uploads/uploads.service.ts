import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common'
import { AwsS3Service } from '../aws/aws-s3.service' // Импортируем AwsS3Service
// import { Express } from 'express'; // Express обычно доступен глобально или через @types/express

@Injectable()
export class UploadsService {
  constructor(@Inject(AwsS3Service) private readonly awsS3Service: AwsS3Service) {}

  async uploadFile(file: Express.Multer.File, folderName: string): Promise<{ url: string; fileKey: string }> {
    if (!file) {
      throw new InternalServerErrorException('Файл для загрузки не предоставлен.')
    }
    if (!folderName || folderName.trim() === '') {
      // Дополнительная проверка на случай, если контроллер передаст пустую строку
      throw new InternalServerErrorException('Имя папки для загрузки не предоставлено или некорректно.')
    }

    try {
      // Используем предоставленный folderName
      const fileKey = await this.awsS3Service.uploadFile(file, folderName.trim())
      if (!fileKey) {
        // Дополнительная проверка, если uploadFile может вернуть null/undefined
        throw new InternalServerErrorException('Не удалось получить ключ файла после загрузки в хранилище.')
      }
      const url = this.awsS3Service.getFileUrl(fileKey)

      return { url, fileKey }
    } catch (error) {
      console.error(`Ошибка при загрузке файла в папку '${folderName}' через AwsS3Service:`, error)
      // Можно добавить более специфичную обработку ошибок от AwsS3Service, если это необходимо
      throw new InternalServerErrorException('Не удалось загрузить файл в хранилище.')
    }
  }
}

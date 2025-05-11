import { Module } from '@nestjs/common'
import { UploadsController } from './uploads.controller'
import { UploadsService } from './uploads.service'
// Предполагаемый путь к модулю AwsS3Module, УБЕДИТЕСЬ, ЧТО ОН ВЕРНЫЙ
import { AwsModule } from '../aws/aws.module'

@Module({
  imports: [
    AwsModule // Добавляем AwsS3Module, чтобы AwsS3Service был доступен для инъекции
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService
    // AwsS3Service здесь не нужно объявлять в providers,
    // если он уже предоставлен и экспортирован из AwsS3Module.
  ]
})
export class UploadsModule {}

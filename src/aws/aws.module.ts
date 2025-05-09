import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AwsS3Service } from './aws-s3.service'

@Global() // Делаем модуль глобальным, чтобы AwsS3Service был доступен везде
@Module({
  imports: [ConfigModule], // ConfigService будет доступен для AwsS3Service
  providers: [AwsS3Service],
  exports: [AwsS3Service]
})
export class AwsModule {}

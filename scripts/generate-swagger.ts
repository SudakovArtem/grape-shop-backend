import { NestFactory } from '@nestjs/core'
import { AppModule } from '../dist/src/app.module.js'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import SwaggerParser from '@apidevtools/swagger-parser'
import { writeFile } from 'fs/promises'
import { join } from 'path'

async function generateSwagger() {
  const app = await NestFactory.create(AppModule)

  const config = new DocumentBuilder()
    .setTitle('Grape Shop API')
    .setDescription('API для интернет-магазина саженцев винограда')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  const api = (await SwaggerParser.dereference(document)) as Record<string, unknown>

  const outputPath = join(process.cwd(), 'openapi.json')
  await writeFile(outputPath, JSON.stringify(api, null, 2), 'utf-8')

  console.log('✅ Swagger saved to openapi.json')
  await app.close()
}

generateSwagger()

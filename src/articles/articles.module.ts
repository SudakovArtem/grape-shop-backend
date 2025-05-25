import { Module } from '@nestjs/common'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { ArticleCategoriesModule } from '../article-categories/article-categories.module'

@Module({
  imports: [ArticleCategoriesModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
  exports: [ArticlesService]
})
export class ArticlesModule {}

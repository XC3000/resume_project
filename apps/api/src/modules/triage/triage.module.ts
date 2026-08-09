import { Module, forwardRef } from '@nestjs/common';
import { RedisConnectionProvider, REDIS_CONNECTION } from './redis.provider';
import { TriageService } from './triage.service';
import { TriageController } from './triage.controller';
import { TriageProcessor } from './triage.processor';
import { GeminiEmbeddingService } from './embedding.service';
import { ClassifierService } from './classifier.service';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [forwardRef(() => GithubModule)],
  controllers: [TriageController],
  providers: [
    RedisConnectionProvider,
    TriageService,
    TriageProcessor,
    ClassifierService,
    {
      provide: 'IEmbeddingService',
      useClass: GeminiEmbeddingService,
    },
  ],
  exports: [TriageService, 'IEmbeddingService', ClassifierService, REDIS_CONNECTION, RedisConnectionProvider],
})
export class TriageModule {}

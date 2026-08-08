import { Module } from '@nestjs/common';
import { RedisConnectionProvider } from './redis.provider';
import { TriageService } from './triage.service';
import { TriageController } from './triage.controller';
import { TriageProcessor } from './triage.processor';
import { GeminiEmbeddingService } from './embedding.service';
import { ClassifierService } from './classifier.service';

@Module({
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
  exports: [TriageService, 'IEmbeddingService', ClassifierService],
})
export class TriageModule {}

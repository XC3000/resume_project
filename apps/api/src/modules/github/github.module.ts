import { Module, forwardRef } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';
import { TriageModule } from '../triage/triage.module';

@Module({
  imports: [forwardRef(() => TriageModule)],
  providers: [GithubService],
  controllers: [GithubController],
  exports: [GithubService],
})
export class GithubModule {}

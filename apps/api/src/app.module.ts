import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TriageModule } from './modules/triage/triage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [TriageModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

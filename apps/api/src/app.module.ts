import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TriageModule } from './modules/triage/triage.module';

@Module({
  imports: [TriageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TriageModule } from './modules/triage/triage.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule, TriageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

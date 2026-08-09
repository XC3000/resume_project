import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TriageModule } from './modules/triage/triage.module';
import { AuthModule } from './auth/auth.module';
import { OrgsModule } from './modules/orgs/orgs.module';

@Module({
  imports: [AuthModule, TriageModule, OrgsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { OrgsController } from './orgs.controller';
import { DemoSeedService } from './demo-seed.service';

@Module({
  providers: [OrgsService, DemoSeedService],
  controllers: [OrgsController],
})
export class OrgsModule {}

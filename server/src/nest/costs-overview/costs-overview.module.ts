import { Module } from '@nestjs/common';
import { CostsOverviewController } from './costs-overview.controller';
import { CostsOverviewService } from './costs-overview.service';
import { BudgetModule } from '../budget/budget.module';
import { SettingsModule } from '../settings/settings.module';
import { AddonsModule } from '../addons/addons.module';
import { TripMembershipModule } from '../trip-membership/trip-membership.module';

/** Cross-trip cost overview (#2). Registered in AppModule; nothing imports it. */
@Module({
  imports: [BudgetModule, SettingsModule, AddonsModule, TripMembershipModule],
  controllers: [CostsOverviewController],
  providers: [CostsOverviewService],
})
export class CostsOverviewModule {}

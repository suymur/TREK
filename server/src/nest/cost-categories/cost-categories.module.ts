import { Module } from '@nestjs/common';
import { CostCategoriesController } from './cost-categories.controller';
import { CostCategoriesService } from './cost-categories.service';
import { CostCategoriesMcp } from './cost-categories.mcp';
import { RealtimeModule } from '../realtime/realtime.module';
import { AddonsModule } from '../addons/addons.module';

/**
 * Custom cost categories (#4). A leaf: BudgetModule imports it to store only
 * known `custom:<id>` keys, CostsOverviewModule to group by them.
 */
@Module({
  imports: [RealtimeModule, AddonsModule],
  controllers: [CostCategoriesController],
  providers: [CostCategoriesService, CostCategoriesMcp],
  exports: [CostCategoriesService],
})
export class CostCategoriesModule {}

import { McpController, Tool, TOOL_ANNOTATIONS_READONLY, ok, type McpContext } from '../../nest-mcp';
import { COST_CATEGORIES, customCostCategoryKey } from '@trek/shared';
import { ADDON_IDS } from '../../addons';
import { addonGate } from '../addons/addon-gate';
import { AddonsService } from '../addons/addons.service';
import { CostCategoriesService } from './cost-categories.service';

/**
 * MCP read of the custom cost categories (#4), so a model can file an expense
 * under `custom:<id>` with create_budget_item / update_budget_item. Rides the
 * budget addon and the budget read scope like the other cost tools. Creating
 * and deleting categories stays in the app: they are instance-wide.
 */
@McpController()
export class CostCategoriesMcp {
  constructor(
    private readonly categories: CostCategoriesService,
    readonly addons: AddonsService,
  ) {}

  @Tool({
    name: 'list_cost_categories',
    description: 'List the cost categories an expense can use: the fixed keys, and the custom categories every user of this TREK shares, each with the `key` (custom:<id>) to pass as `category` to create_budget_item or update_budget_item.',
    inputSchema: {},
    annotations: TOOL_ANNOTATIONS_READONLY,
    when: addonGate(ADDON_IDS.BUDGET),
    access: { group: 'budget', mode: 'read' },
  })
  listCostCategories(_args: Record<string, never>, _ctx: McpContext) {
    const custom = this.categories.list().map((c) => ({ key: customCostCategoryKey(c.id), name: c.name, icon: c.icon, color: c.color }));
    return ok({ fixed: COST_CATEGORIES, custom });
  }
}

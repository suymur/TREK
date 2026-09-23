import { Injectable } from '@nestjs/common';
import type { CostsOverviewResponse } from '@trek/shared';
import { DatabaseService } from '../database/database.service';
import { TripMembershipService } from '../trip-membership/trip-membership.service';
import { SettingsService } from '../settings/settings.service';
import { AddonsService } from '../addons/addons.service';
import { ExchangeRatesService } from '../budget/exchange-rates.service';
import { ADDON_IDS } from '../../addons';
import { avatarUrl } from '../common/avatarUrl';
import {
  buildCostsOverview,
  needsLiveRates,
  resolveOverviewCurrency,
  tripCurrencyOf,
  type OverviewItemRow,
  type OverviewMemberRow,
  type OverviewTripRow,
} from './costs-overview.helpers';

/**
 * The costs of every trip a user can reach, on one page (#2).
 *
 * Its own module rather than a method on BudgetService: the display currency is a
 * user setting, and SettingsModule imports AuthModule, which imports BudgetModule —
 * so the budget domain cannot reach the settings without closing a cycle. Nothing
 * imports this module, so it can depend on both.
 *
 * The trip set is the one CostsRpc.listMine uses (TripMembershipService), newest
 * first: owned trips plus trips the user is a member of, nothing else.
 */
@Injectable()
export class CostsOverviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly membership: TripMembershipService,
    private readonly settings: SettingsService,
    private readonly exchangeRates: ExchangeRatesService,
    private readonly addons: AddonsService,
  ) {}

  isEnabled(): boolean {
    return this.addons.isAddonEnabled(ADDON_IDS.BUDGET);
  }

  async overview(userId: number): Promise<CostsOverviewResponse> {
    const tripIds = this.membership.listAccessibleTripIds(userId);
    const trips = this.loadTrips(tripIds);
    const items = this.loadItems(tripIds);
    const members = this.loadMembers(tripIds);
    const display = resolveOverviewCurrency(
      this.settings.getUserSettings(userId).default_currency,
      trips.map(tripCurrencyOf),
    );
    const rates = needsLiveRates(trips, items, display) ? await this.exchangeRates.getRates(display) : null;
    return buildCostsOverview(trips, items, members, display, rates);
  }

  /** The trip rows in the order of `ids` (newest first). */
  private loadTrips(ids: number[]): OverviewTripRow[] {
    if (ids.length === 0) return [];
    const rows = this.db.all<OverviewTripRow>(
      `SELECT id, title, start_date, end_date, currency, is_archived FROM trips WHERE id IN (${placeholders(ids)})`,
      ...ids,
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is OverviewTripRow => r !== undefined);
  }

  private loadItems(ids: number[]): OverviewItemRow[] {
    if (ids.length === 0) return [];
    return this.db.all<OverviewItemRow>(
      `SELECT bi.id, bi.trip_id, bi.category, bi.total_price, bi.currency, bi.exchange_rate, bi.cost_status,
         CASE WHEN EXISTS (SELECT 1 FROM budget_item_installments i WHERE i.budget_item_id = bi.id)
           THEN MAX(0, bi.total_price - (SELECT COALESCE(SUM(i.amount), 0) FROM budget_item_installments i WHERE i.budget_item_id = bi.id AND i.paid_at IS NOT NULL))
           ELSE 0 END AS open_amount
       FROM budget_items bi WHERE bi.trip_id IN (${placeholders(ids)})`,
      ...ids,
    );
  }

  private loadMembers(ids: number[]): OverviewMemberRow[] {
    if (ids.length === 0) return [];
    return this.db
      .all<Omit<OverviewMemberRow, 'avatar_url'> & { avatar: string | null }>(memberSql(ids), ...ids)
      .map(({ avatar, ...m }) => ({ ...m, avatar_url: avatarUrl({ avatar }) }));
  }
}

/**
 * Who takes part in each expense of these trips, with the name and avatar the
 * Costs tab shows (display name first).
 */
function memberSql(ids: number[]): string {
  return `
    SELECT bm.budget_item_id, bm.user_id, bm.amount, COALESCE(u.display_name, u.username) AS username, u.avatar
    FROM budget_item_members bm
    JOIN budget_items bi ON bi.id = bm.budget_item_id
    JOIN users u ON u.id = bm.user_id
    WHERE bi.trip_id IN (${placeholders(ids)})`;
}

/** One bound `?` per id; the ids themselves never enter the SQL text. */
function placeholders(ids: number[]): string {
  return ids.map(() => '?').join(', ');
}

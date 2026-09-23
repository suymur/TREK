import { Injectable } from '@nestjs/common';
import {
  customCostCategoryKey,
  type CostCategoryCreateRequest,
  type CostCategoryRecord,
  type CostCategoryUpdateRequest,
} from '@trek/shared';
import { DatabaseService } from '../database/database.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AddonsService } from '../addons/addons.service';
import { ADDON_IDS } from '../../addons';

/** Who is asking: the creator or an admin may change a category. */
export interface CostCategoryActor {
  id: number;
  role: string;
}

/** A refusal the controller and the MCP tool turn into their own error shape. */
export type CostCategoryRefusal =
  | { ok: false; status: 404; error: 'Category not found' }
  | { ok: false; status: 403; error: 'Only the creator or an admin can change this category' }
  | { ok: false; status: 409; error: 'A category with this name already exists' };

export type CostCategoryResult<T> = { ok: true; value: T } | CostCategoryRefusal;

const NOT_FOUND: CostCategoryRefusal = { ok: false, status: 404, error: 'Category not found' };
const FORBIDDEN: CostCategoryRefusal = { ok: false, status: 403, error: 'Only the creator or an admin can change this category' };
const DUPLICATE: CostCategoryRefusal = { ok: false, status: 409, error: 'A category with this name already exists' };

const COLUMNS = 'id, name, icon, color, created_by, created_at, sort_order';

/**
 * Custom cost categories (#4). Instance-wide, so there is no trip to check:
 * any signed-in user creates one, and only its creator or an admin renames or
 * deletes it.
 *
 * Changes reach other clients as `costs:categories-changed` with the full list.
 * There is no instance-wide socket room, so the list is sent to every user with
 * an open socket (the same user-scoped channel invitations use). A client that
 * was offline reads the list again the next time it opens the Costs tab.
 */
@Injectable()
export class CostCategoriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly realtime: RealtimeService,
    private readonly addons: AddonsService,
  ) {}

  /** The categories ride the Costs addon, like the rest of the costs surface. */
  isEnabled(): boolean {
    return this.addons.isAddonEnabled(ADDON_IDS.BUDGET);
  }

  list(): CostCategoryRecord[] {
    return this.db.all<CostCategoryRecord>(`SELECT ${COLUMNS} FROM cost_categories ORDER BY sort_order, id`);
  }

  /** The ids that exist right now, for resolveCostCategory. */
  knownIds(): Set<number> {
    return new Set(this.db.all<{ id: number }>('SELECT id FROM cost_categories').map((r) => r.id));
  }

  get(id: number): CostCategoryRecord | undefined {
    return this.db.get<CostCategoryRecord>(`SELECT ${COLUMNS} FROM cost_categories WHERE id = ?`, id);
  }

  create(actor: CostCategoryActor, body: CostCategoryCreateRequest): CostCategoryResult<CostCategoryRecord> {
    return this.db.transaction(() => {
      if (this.nameTaken(body.name)) return DUPLICATE;
      const max = this.db.get<{ max: number | null }>('SELECT MAX(sort_order) AS max FROM cost_categories');
      const sortOrder = (max?.max ?? -1) + 1;
      const result = this.db.run(
        'INSERT INTO cost_categories (name, icon, color, created_by, sort_order) VALUES (?, ?, ?, ?, ?)',
        body.name,
        body.icon,
        body.color.toLowerCase(),
        actor.id,
        sortOrder,
      );
      return { ok: true as const, value: this.get(Number(result.lastInsertRowid))! };
    });
  }

  update(id: number, actor: CostCategoryActor, body: CostCategoryUpdateRequest): CostCategoryResult<CostCategoryRecord> {
    return this.db.transaction(() => {
      const current = this.get(id);
      if (!current) return NOT_FOUND;
      if (!this.mayChange(current, actor)) return FORBIDDEN;
      if (body.name !== undefined && this.nameTaken(body.name, id)) return DUPLICATE;
      this.db.run(
        'UPDATE cost_categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ?',
        body.name ?? null,
        body.icon ?? null,
        body.color?.toLowerCase() ?? null,
        id,
      );
      return { ok: true as const, value: this.get(id)! };
    });
  }

  /**
   * Delete a category and move its expenses to `other`, in one transaction.
   * The per-trip category order row follows the expenses: it becomes the
   * trip's `other` row, or goes when the trip has one already.
   */
  remove(id: number, actor: CostCategoryActor): CostCategoryResult<{ moved: number }> {
    return this.db.transaction(() => {
      const current = this.get(id);
      if (!current) return NOT_FOUND;
      if (!this.mayChange(current, actor)) return FORBIDDEN;
      const key = customCostCategoryKey(id);
      const moved = this.db.run("UPDATE budget_items SET category = 'other' WHERE category = ?", key).changes;
      this.db.run("UPDATE OR IGNORE budget_category_order SET category = 'other' WHERE category = ?", key);
      this.db.run('DELETE FROM budget_category_order WHERE category = ?', key);
      this.db.run('DELETE FROM cost_categories WHERE id = ?', id);
      return { ok: true as const, value: { moved } };
    });
  }

  /** Send the current list to every user with an open socket; skip the sender's socket. */
  broadcastChanged(excludeSid?: string): void {
    const categories = this.list();
    for (const userId of this.realtime.getOnlineUserIds()) {
      this.realtime.broadcastToUser(userId, { type: 'costs:categories-changed', categories }, excludeSid);
    }
  }

  private mayChange(category: CostCategoryRecord, actor: CostCategoryActor): boolean {
    return actor.role === 'admin' || category.created_by === actor.id;
  }

  private nameTaken(name: string, exceptId?: number): boolean {
    return !!this.db.get(
      'SELECT 1 FROM cost_categories WHERE name = ? COLLATE NOCASE AND id != ?',
      name,
      exceptId ?? 0,
    );
  }
}

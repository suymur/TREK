/**
 * Custom cost categories e2e (#4) — /api/costs/categories through the real
 * JwtAuthGuard against a temp SQLite db with the full schema, plus the two
 * places a custom key travels: the budget write path (a key without a category
 * is stored as `other`) and the cross-trip overview (grouped by custom key).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { costCategoryListResponseSchema, costCategoryResponseSchema, costsOverviewResponseSchema } from '@trek/shared';
import { DatabaseModule } from '../../src/nest/database/database.module';
import { sessionCookie } from './harness';

const { db, ws } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const tmp = new Database(':memory:');
  tmp.exec('PRAGMA journal_mode = WAL');
  tmp.exec('PRAGMA foreign_keys = ON');
  return {
    db: tmp,
    ws: {
      broadcast: vi.fn(),
      broadcastToUser: vi.fn(),
      getOnlineUserIds: vi.fn(() => new Set<number>()),
    },
  };
});

vi.mock('../../src/db/database', () => ({
  db,
  closeDb: () => {},
  reinitialize: () => {},
  // The trip owner reaches the budget routes; nobody else needs to here.
  canAccessTrip: (tripId: number, userId: number) =>
    db.prepare('SELECT id, user_id, currency FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
  getPlaceWithTags: () => null,
  isOwner: (tripId: number, userId: number) =>
    !!db.prepare('SELECT 1 FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
}));
vi.mock('../../src/websocket', () => ws);

import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { CostCategoriesModule } from '../../src/nest/cost-categories/cost-categories.module';
import { CostsOverviewModule } from '../../src/nest/costs-overview/costs-overview.module';
import { ExchangeRatesService } from '../../src/nest/budget/exchange-rates.service';
import { TrekExceptionFilter } from '../../src/nest/common/trek-exception.filter';
import { ZodValidationPipe } from '../../src/nest/common/zod-validation.pipe';

const ADMIN = 1;
const CREATOR = 2;
const OTHER = 3;

describe('Custom cost categories e2e (real auth guard + temp SQLite)', () => {
  let server: Server;
  let app: Awaited<ReturnType<typeof build>>;
  let trip: number;

  async function build() {
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule, CostCategoriesModule, CostsOverviewModule] })
      .overrideProvider(ExchangeRatesService)
      .useValue({ getRates: async () => ({ EUR: 1 }) })
      .compile();
    const nest = moduleRef.createNestApplication();
    nest.use(cookieParser());
    nest.useGlobalFilters(new TrekExceptionFilter());
    nest.useGlobalPipes(new ZodValidationPipe());
    await nest.init();
    return nest;
  }

  const as = (userId: number) => ({
    get: (url: string) => request(server).get(url).set('Cookie', sessionCookie(userId)),
    post: (url: string, body: object) => request(server).post(url).set('Cookie', sessionCookie(userId)).send(body),
    put: (url: string, body: object) => request(server).put(url).set('Cookie', sessionCookie(userId)).send(body),
    del: (url: string) => request(server).delete(url).set('Cookie', sessionCookie(userId)),
  });

  const create = async (userId: number, name: string) => {
    const res = await as(userId).post('/api/costs/categories', { name, icon: 'gift', color: '#DB2777' });
    expect(res.status).toBe(201);
    return costCategoryResponseSchema.parse(res.body).category;
  };

  const setBudgetAddon = (enabled: boolean) => {
    db.prepare("INSERT OR IGNORE INTO addons (id, name, type, enabled) VALUES ('budget', 'Costs', 'trip', 1)").run();
    db.prepare("UPDATE addons SET enabled = ? WHERE id = 'budget'").run(enabled ? 1 : 0);
  };

  const categoryOf = (itemId: number) =>
    (db.prepare('SELECT category FROM budget_items WHERE id = ?').get(itemId) as { category: string }).category;

  beforeAll(async () => {
    createTables(db);
    runMigrations(db);
    const insertUser = db.prepare(
      "INSERT INTO users (id, username, email, password_hash, role, password_version) VALUES (?, ?, ?, 'x', ?, 0)",
    );
    insertUser.run(ADMIN, 'admin', 'admin@example.test', 'admin');
    insertUser.run(CREATOR, 'creator', 'creator@example.test', 'user');
    insertUser.run(OTHER, 'other', 'other@example.test', 'user');
    trip = Number(
      db.prepare("INSERT INTO trips (user_id, title, currency) VALUES (?, 'Wedding', 'EUR')").run(CREATOR).lastInsertRowid,
    );
    app = await build();
    server = app.getHttpServer();
  });

  beforeEach(() => {
    setBudgetAddon(true);
    db.exec('DELETE FROM budget_items; DELETE FROM budget_category_order; DELETE FROM cost_categories');
    ws.broadcastToUser.mockClear();
    ws.getOnlineUserIds.mockReturnValue(new Set<number>());
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 without a session', async () => {
    expect((await request(server).get('/api/costs/categories')).status).toBe(401);
  });

  it('403 on every route while the Costs addon is off', async () => {
    setBudgetAddon(false);
    const res = await as(CREATOR).get('/api/costs/categories');
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Costs addon is not enabled' });
    expect((await as(CREATOR).post('/api/costs/categories', { name: 'X', icon: 'tag', color: '#000000' })).status).toBe(403);
  });

  it('lets any user create a category that every user then lists, in creation order', async () => {
    const deko = await create(CREATOR, '  Deko ');
    expect(deko).toMatchObject({ name: 'Deko', icon: 'gift', color: '#db2777', created_by: CREATOR, sort_order: 0 });
    await create(OTHER, 'Kleidung');

    const res = await as(ADMIN).get('/api/costs/categories');
    expect(res.status).toBe(200);
    expect(costCategoryListResponseSchema.parse(res.body).categories.map((c) => c.name)).toEqual(['Deko', 'Kleidung']);
  });

  it('refuses a second category of the same name in any letter case (409)', async () => {
    await create(CREATOR, 'Deko');
    const res = await as(OTHER).post('/api/costs/categories', { name: 'DEKO', icon: 'tag', color: '#000000' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'A category with this name already exists' });
  });

  it('validates the body through the shared schema (400)', async () => {
    const res = await as(CREATOR).post('/api/costs/categories', { name: 'X', icon: 'rocket', color: 'red' });
    expect(res.status).toBe(400);
  });

  it('lets the creator and an admin edit, and refuses anyone else', async () => {
    const deko = await create(CREATOR, 'Deko');
    const url = `/api/costs/categories/${deko.id}`;

    const denied = await as(OTHER).put(url, { name: 'Mine' });
    expect(denied.status).toBe(403);

    const byCreator = await as(CREATOR).put(url, { name: 'Dekoration' });
    expect(byCreator.status).toBe(200);
    expect(byCreator.body.category).toMatchObject({ name: 'Dekoration', icon: 'gift' });

    const byAdmin = await as(ADMIN).put(url, { icon: 'sparkles', color: '#123ABC' });
    expect(byAdmin.body.category).toMatchObject({ name: 'Dekoration', icon: 'sparkles', color: '#123abc' });

    expect((await as(ADMIN).put('/api/costs/categories/9999', { name: 'Gone' })).status).toBe(404);
  });

  it('keeps the own name on a rename that only changes the case', async () => {
    const deko = await create(CREATOR, 'Deko');
    const res = await as(CREATOR).put(`/api/costs/categories/${deko.id}`, { name: 'DEKO' });
    expect(res.status).toBe(200);
    expect(res.body.category.name).toBe('DEKO');
  });

  it('stores a custom key on an expense, and a key without a category as other', async () => {
    const deko = await create(CREATOR, 'Deko');
    const base = `/api/trips/${trip}/budget`;

    const known = await as(CREATOR).post(base, { name: 'Flowers', category: `custom:${deko.id}`, total_price: 80 });
    expect(known.status).toBe(201);
    expect(known.body.item.category).toBe(`custom:${deko.id}`);

    const unknown = await as(CREATOR).post(base, { name: 'Ghost', category: 'custom:9999', total_price: 5 });
    expect(unknown.body.item.category).toBe('other');

    const moved = await as(CREATOR).put(`${base}/${known.body.item.id}`, { category: 'custom:9999' });
    expect(moved.body.item.category).toBe('other');

    // The legacy free text is untouched.
    const legacy = await as(CREATOR).post(base, { name: 'Taxi', category: 'Taxi', total_price: 5 });
    expect(legacy.body.item.category).toBe('Taxi');
  });

  it('groups the overview by custom category after the fixed ones', async () => {
    const deko = await create(CREATOR, 'Deko');
    const kleidung = await create(CREATOR, 'Kleidung');
    const add = db.prepare("INSERT INTO budget_items (trip_id, category, name, total_price) VALUES (?, ?, 'x', ?)");
    add.run(trip, `custom:${kleidung.id}`, 30);
    add.run(trip, `custom:${deko.id}`, 20);
    add.run(trip, 'food', 10);
    add.run(trip, 'custom:9999', 1); // a category that does not exist

    const body = costsOverviewResponseSchema.parse((await as(CREATOR).get('/api/costs/overview')).body);
    expect(body.categories.map((c) => [c.category, c.total])).toEqual([
      ['food', 10],
      ['other', 1],
      [`custom:${deko.id}`, 20],
      [`custom:${kleidung.id}`, 30],
    ]);
  });

  it('deletes a category in use and moves its expenses to other', async () => {
    const deko = await create(CREATOR, 'Deko');
    const key = `custom:${deko.id}`;
    const add = db.prepare("INSERT INTO budget_items (trip_id, category, name, total_price) VALUES (?, ?, 'x', 1)");
    const a = Number(add.run(trip, key).lastInsertRowid);
    const b = Number(add.run(trip, key).lastInsertRowid);
    const c = Number(add.run(trip, 'food').lastInsertRowid);
    db.prepare('INSERT INTO budget_category_order (trip_id, category, sort_order) VALUES (?, ?, 0)').run(trip, key);

    expect((await as(OTHER).del(`/api/costs/categories/${deko.id}`)).status).toBe(403);
    expect(categoryOf(a)).toBe(key);

    const res = await as(CREATOR).del(`/api/costs/categories/${deko.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, moved: 2 });
    expect([categoryOf(a), categoryOf(b), categoryOf(c)]).toEqual(['other', 'other', 'food']);
    expect(db.prepare('SELECT category FROM budget_category_order WHERE trip_id = ?').all(trip)).toEqual([{ category: 'other' }]);
    expect((await as(CREATOR).get('/api/costs/categories')).body.categories).toEqual([]);
    expect((await as(CREATOR).del(`/api/costs/categories/${deko.id}`)).status).toBe(404);
  });

  it('lets an admin delete a category someone else created', async () => {
    const deko = await create(CREATOR, 'Deko');
    const res = await as(ADMIN).del(`/api/costs/categories/${deko.id}`);
    expect(res.body).toEqual({ success: true, moved: 0 });
  });

  it('never hands out a deleted id again', async () => {
    const first = await create(CREATOR, 'One');
    await as(CREATOR).del(`/api/costs/categories/${first.id}`);
    const second = await create(CREATOR, 'Two');
    expect(second.id).toBeGreaterThan(first.id);
  });

  it('sends the new list to every online user but not to the sending socket', async () => {
    ws.getOnlineUserIds.mockReturnValue(new Set([ADMIN, OTHER]));
    const res = await as(CREATOR)
      .post('/api/costs/categories')
      .set('X-Socket-Id', '42')
      .send({ name: 'Deko', icon: 'tag', color: '#000000' });
    expect(res.status).toBe(201);
    expect(ws.broadcastToUser).toHaveBeenCalledTimes(2);
    const [userId, payload, excluded] = ws.broadcastToUser.mock.calls[0]!;
    expect(userId).toBe(ADMIN);
    expect(payload).toMatchObject({ type: 'costs:categories-changed', categories: [{ name: 'Deko' }] });
    expect(excluded).toBe('42');
  });
});

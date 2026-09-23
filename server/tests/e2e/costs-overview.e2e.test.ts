/**
 * Cost overview e2e (#2) — GET /api/costs/overview through the real JwtAuthGuard
 * against a temp SQLite db with the full real schema, so the trip set, the item
 * query and the default-currency lookup run their real SQL. Only the live FX feed
 * is replaced (no network in tests).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { Test } from '@nestjs/testing';
import { costsOverviewResponseSchema } from '@trek/shared';
import { DatabaseModule } from '../../src/nest/database/database.module';
import { sessionCookie } from './harness';

const { db } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const tmp = new Database(':memory:');
  tmp.exec('PRAGMA journal_mode = WAL');
  tmp.exec('PRAGMA foreign_keys = ON');
  return { db: tmp };
});

vi.mock('../../src/db/database', () => ({
  db,
  closeDb: () => {},
  reinitialize: () => {},
  canAccessTrip: () => null,
  getPlaceWithTags: () => null,
  isOwner: () => false,
}));
vi.mock('../../src/websocket', () => ({ broadcast: vi.fn() }));

import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { CostsOverviewModule } from '../../src/nest/costs-overview/costs-overview.module';
import { ExchangeRatesService } from '../../src/nest/budget/exchange-rates.service';
import { TrekExceptionFilter } from '../../src/nest/common/trek-exception.filter';
import { ZodValidationPipe } from '../../src/nest/common/zod-validation.pipe';

const getRates = vi.fn<(base: string) => Promise<Record<string, number> | null>>();

describe('Cost overview e2e (real auth guard + temp SQLite)', () => {
  let server: Server;
  let app: Awaited<ReturnType<typeof build>>;
  let rome: number;
  let tokyo: number;
  let foreign: number;

  async function build() {
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule, CostsOverviewModule] })
      .overrideProvider(ExchangeRatesService)
      .useValue({ getRates })
      .compile();
    const nest = moduleRef.createNestApplication();
    nest.use(cookieParser());
    nest.useGlobalFilters(new TrekExceptionFilter());
    nest.useGlobalPipes(new ZodValidationPipe());
    await nest.init();
    return nest;
  }

  const addItem = (tripId: number, category: string, price: number, currency: string | null = null, rate = 1) =>
    db.prepare('INSERT INTO budget_items (trip_id, category, name, total_price, currency, exchange_rate) VALUES (?, ?, ?, ?, ?, ?)')
      .run(tripId, category, `${category} ${price}`, price, currency, rate);

  const setBudgetAddon = (enabled: boolean) => {
    db.prepare("INSERT OR IGNORE INTO addons (id, name, type, enabled) VALUES ('budget', 'Costs', 'trip', 1)").run();
    db.prepare("UPDATE addons SET enabled = ? WHERE id = 'budget'").run(enabled ? 1 : 0);
  };

  const get = (userId: number) => request(server).get('/api/costs/overview').set('Cookie', sessionCookie(userId));

  beforeAll(async () => {
    createTables(db);
    runMigrations(db);
    const insertUser = db.prepare(
      "INSERT INTO users (id, username, email, password_hash, role, password_version) VALUES (?, ?, ?, 'x', 'user', 0)",
    );
    insertUser.run(1, 'owner', 'owner@example.test');
    insertUser.run(2, 'partner', 'partner@example.test');
    insertUser.run(3, 'stranger', 'stranger@example.test');

    const insertTrip = db.prepare(
      "INSERT INTO trips (user_id, title, currency, start_date, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    rome = Number(insertTrip.run(1, 'Rome', 'EUR', '2026-05-01', '2026-01-01 10:00:00').lastInsertRowid);
    tokyo = Number(insertTrip.run(1, 'Tokyo', 'JPY', '2026-10-01', '2026-02-01 10:00:00').lastInsertRowid);
    foreign = Number(insertTrip.run(3, 'Not yours', 'EUR', null, '2026-03-01 10:00:00').lastInsertRowid);
    // Both trips are shared by both users.
    db.prepare('INSERT INTO trip_members (trip_id, user_id) VALUES (?, 2), (?, 2)').run(rome, tokyo);

    addItem(rome, 'food', 40);
    addItem(rome, 'accommodation', 200);
    addItem(rome, 'Flight', 150.5); // a legacy free-text label
    addItem(rome, 'food', 20, 'USD', 1.25); // frozen: 20 USD at 1.25 = 16 EUR
    addItem(tokyo, 'food', 3000);
    addItem(tokyo, 'transport', 12000);
    addItem(foreign, 'food', 999);

    app = await build();
    server = app.getHttpServer();
  });

  beforeEach(() => {
    setBudgetAddon(true);
    db.exec('DELETE FROM settings');
    getRates.mockReset();
    // Units per 1 EUR.
    getRates.mockResolvedValue({ EUR: 1, JPY: 150, USD: 1.1 });
  });

  afterAll(async () => {
    await app.close();
  });

  it('401 without a session', async () => {
    const res = await request(server).get('/api/costs/overview');
    expect(res.status).toBe(401);
  });

  it('403 while the Costs addon is off', async () => {
    setBudgetAddon(false);
    const res = await get(1);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Costs addon is not enabled' });
  });

  it('lists each accessible trip with its own total, newest first, and never a foreign trip', async () => {
    db.prepare("INSERT INTO settings (user_id, key, value) VALUES (1, 'default_currency', '\"EUR\"')").run();
    const res = await get(1);
    expect(res.status).toBe(200);
    const body = costsOverviewResponseSchema.parse(res.body);
    expect(body.currency).toBe('EUR');
    expect(body.trips.map((t) => t.trip_id)).toEqual([tokyo, rome]);
    expect(body.trips.some((t) => t.trip_id === foreign)).toBe(false);

    const [tk, rm] = body.trips;
    expect(rm).toMatchObject({ title: 'Rome', currency: 'EUR', item_count: 4, total: 406.5, display_total: 406.5 });
    expect(tk).toMatchObject({ title: 'Tokyo', currency: 'JPY', item_count: 2, total: 15000, display_total: 100 });
    expect(rm!.categories.map((c) => [c.category, c.total])).toEqual([
      ['accommodation', 200],
      ['food', 56],
      ['flights', 150.5],
    ]);

    // Global total = sum of the trip rows in the display currency; the split sums to it.
    expect(body.total).toBe(506.5);
    const cents = (xs: number[]) => xs.reduce((a, v) => a + Math.round(v * 100), 0);
    expect(cents(body.categories.map((c) => c.total))).toBe(cents([body.total]));
    for (const t of body.trips) {
      expect(cents(t.categories.map((c) => c.total))).toBe(cents([t.total]));
    }
    expect(getRates).toHaveBeenCalledWith('EUR');
  });

  it('shows the same two trips to the other member, not a combined total', async () => {
    const res = await get(2);
    const body = costsOverviewResponseSchema.parse(res.body);
    expect(body.trips.map((t) => [t.trip_id, t.total])).toEqual([[tokyo, 15000], [rome, 406.5]]);
  });

  it('adds up in the user default currency', async () => {
    db.prepare("INSERT INTO settings (user_id, key, value) VALUES (1, 'default_currency', '\"JPY\"')").run();
    // Units per 1 JPY.
    getRates.mockResolvedValue({ JPY: 1, EUR: 0.01, USD: 0.011 });
    const body = costsOverviewResponseSchema.parse((await get(1)).body);
    expect(body.currency).toBe('JPY');
    expect(body.trips.find((t) => t.trip_id === rome)?.display_total).toBe(40650);
    expect(body.total).toBe(55650);
  });

  it('without a default currency, adds up in the currency of the newest trip on a tie', async () => {
    const body = costsOverviewResponseSchema.parse((await get(1)).body);
    expect(body.currency).toBe('JPY');
  });

  it('names a trip it could not convert and leaves it out of the global total', async () => {
    db.prepare("INSERT INTO settings (user_id, key, value) VALUES (1, 'default_currency', '\"EUR\"')").run();
    getRates.mockResolvedValue(null);
    const body = costsOverviewResponseSchema.parse((await get(1)).body);
    expect(body.unconverted_trip_ids).toEqual([tokyo]);
    expect(body.trips.find((t) => t.trip_id === tokyo)?.display_total).toBeNull();
    expect(body.total).toBe(406.5);
  });

  it('answers an empty overview for a user without trips', async () => {
    db.prepare("INSERT INTO users (id, username, email, password_hash, role, password_version) VALUES (4, 'new', 'new@example.test', 'x', 'user', 0)").run();
    const body = costsOverviewResponseSchema.parse((await get(4)).body);
    expect(body).toEqual({
      currency: 'EUR', trips: [], total: 0, categories: [], people: [], unassigned: 0, participants: [], unconverted_trip_ids: [],
    });
    expect(getRates).not.toHaveBeenCalled();
  });

  it('splits the costs per person, with the rest unassigned', async () => {
    db.prepare("INSERT INTO settings (user_id, key, value) VALUES (1, 'default_currency', '\"EUR\"')").run();
    db.prepare("UPDATE users SET avatar = 'a.png' WHERE id = 2").run();
    const hotel = db.prepare("SELECT id FROM budget_items WHERE trip_id = ? AND category = 'accommodation'").get(rome) as { id: number };
    db.prepare('INSERT INTO budget_item_members (budget_item_id, user_id) VALUES (?, 1), (?, 2)').run(hotel.id, hotel.id);

    const body = costsOverviewResponseSchema.parse((await get(1)).body);
    expect(body.participants).toEqual([
      { user_id: 1, username: 'owner', avatar_url: null },
      { user_id: 2, username: 'partner', avatar_url: '/uploads/avatars/a.png' },
    ]);
    const rm = body.trips.find((t) => t.trip_id === rome)!;
    expect(rm.people).toEqual([
      { user_id: 1, total: 100, display_total: 100 },
      { user_id: 2, total: 100, display_total: 100 },
    ]);
    expect(rm.unassigned).toEqual({ total: 206.5, display_total: 206.5 });
    expect(body.trips.find((t) => t.trip_id === tokyo)!.people).toEqual([]);
    expect(body.people).toEqual([{ user_id: 1, total: 100 }, { user_id: 2, total: 100 }]);
    expect(body.unassigned).toBe(306.5);
  });
});

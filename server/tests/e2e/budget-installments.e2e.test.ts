/**
 * Budget installments e2e (fork #6): partial payments of one expense through
 * the real JwtAuthGuard, the Zod pipe and the real budget SQL on a temp SQLite
 * db with the full schema. Same harness as budget.e2e.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, type MockInstance } from 'vitest';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import { DatabaseModule } from '../../src/nest/database/database.module';
import { RealtimeModule } from '../../src/nest/realtime/realtime.module';
import { Test } from '@nestjs/testing';
import { sessionCookie } from './harness';

const { db } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3');
  const tmp = new Database(':memory:');
  tmp.exec('PRAGMA journal_mode = WAL');
  tmp.exec('PRAGMA foreign_keys = ON');
  return { db: tmp };
});
const { canAccessTrip } = vi.hoisted(() => ({ canAccessTrip: vi.fn() }));

vi.mock('../../src/db/database', () => ({
  db,
  closeDb: () => {},
  reinitialize: () => {},
  canAccessTrip,
  getPlaceWithTags: () => null,
  isOwner: () => false,
}));
vi.mock('../../src/websocket', () => ({ broadcast: vi.fn() }));

import { PermissionsService } from '../../src/nest/permissions/permissions.service';

// Since the permissions DI migration, the check is a spy on the container's
// PermissionsService singleton (created in beforeAll, after build()).
let checkPermission: MockInstance;

import { createTables } from '../../src/db/schema';
import { runMigrations } from '../../src/db/migrations';
import { BudgetModule } from '../../src/nest/budget/budget.module';
import { ExchangeRatesService } from '../../src/nest/budget/exchange-rates.service';
import { TrekExceptionFilter } from '../../src/nest/common/trek-exception.filter';
import { ZodValidationPipe } from '../../src/nest/common/zod-validation.pipe';

describe('Budget installments e2e (real auth guard + temp SQLite)', () => {
  let server: Server;
  let app: Awaited<ReturnType<typeof build>>;
  let tripId: number;

  async function build() {
    const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule, RealtimeModule, BudgetModule] })
      // The settlement read awaits live FX rates; the trip here is all-EUR, so a
      // null result is the identity — and the test never touches the network.
      .overrideProvider(ExchangeRatesService)
      .useValue({ getRates: async () => null })
      .compile();
    const nest = moduleRef.createNestApplication();
    nest.use(cookieParser());
    nest.useGlobalFilters(new TrekExceptionFilter());
    nest.useGlobalPipes(new ZodValidationPipe());
    await nest.init();
    return nest;
  }

  beforeAll(async () => {
    createTables(db);
    runMigrations(db);
    // The temp db carries the real schema (password_hash NOT NULL), so seed the
    // auth users directly instead of via the trimmed-DDL seedUser helper.
    db.prepare(
      "INSERT INTO users (id, username, email, password_hash, role, password_version) VALUES (1, 'e2e-user', 'e2e@example.test', 'x', 'user', 0)",
    ).run();
    db.prepare(
      "INSERT INTO users (id, username, email, password_hash, role, password_version) VALUES (2, 'e2e-peer', 'peer@example.test', 'x', 'user', 0)",
    ).run();
    tripId = Number(db.prepare("INSERT INTO trips (user_id, title, currency) VALUES (1, 'E2E Trip', 'EUR')").run().lastInsertRowid);
    // The peer settles up with the owner below, so they have to be on the trip:
    // a settlement between people who do not share one is refused.
    db.prepare('INSERT INTO trip_members (trip_id, user_id) VALUES (?, 2)').run(tripId);
    app = await build();
    checkPermission = vi.spyOn(app.get(PermissionsService), 'checkPermission');
    server = app.getHttpServer();
  });

  beforeEach(() => {
    canAccessTrip.mockReturnValue({ id: tripId, user_id: 1, currency: 'EUR' });
    checkPermission.mockReturnValue(true);
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => ({
    post: (body: object) => request(server).post(`/api/trips/${tripId}/budget`).set('Cookie', sessionCookie(1)).send(body),
    put: (id: number, body: object) => request(server).put(`/api/trips/${tripId}/budget/${id}`).set('Cookie', sessionCookie(1)).send(body),
    paid: (id: number, instId: number, paid_at: string | null) =>
      request(server).put(`/api/trips/${tripId}/budget/${id}/installments/${instId}/paid`).set('Cookie', sessionCookie(1)).send({ paid_at }),
  });

  const hotel = {
    name: 'Hotel',
    total_price: 3000,
    installments: [
      { label: 'Deposit', amount: 1000, due_date: '2026-09-01', paid_at: '2026-08-20' },
      { label: 'Remainder', amount: 2000, due_date: '2026-10-01' },
    ],
  };

  it('an expense of 3000 with a paid deposit of 1000 is paid 1000, open 2000', async () => {
    const res = await api().post(hotel);
    expect(res.status).toBe(201);
    expect(res.body.item.paid_amount).toBe(1000);
    expect(res.body.item.open_amount).toBe(2000);
    expect(res.body.item.installments).toEqual([
      expect.objectContaining({ label: 'Deposit', amount: 1000, due_date: '2026-09-01', paid_at: '2026-08-20', sort_order: 0 }),
      expect.objectContaining({ label: 'Remainder', amount: 2000, due_date: '2026-10-01', paid_at: null, sort_order: 1 }),
    ]);

    const list = await request(server).get(`/api/trips/${tripId}/budget`).set('Cookie', sessionCookie(1));
    const listed = list.body.items.find((i: { id: number }) => i.id === res.body.item.id);
    expect(listed.installments).toHaveLength(2);
    expect(listed.open_amount).toBe(2000);
  });

  it('splits two deposits independently while settlement stays on the full shares', async () => {
    const created = await api().post({
      name: 'Shared stay', total_price: 839.30,
      payers: [{ user_id: 1, amount: 839.30 }],
      members: [{ user_id: 1, amount: 419.65 }, { user_id: 2, amount: 419.65 }],
      installments: [
        { label: 'First deposit', amount: 200, members: [{ user_id: 1, amount: 100 }, { user_id: 2, amount: 100 }] },
        { label: 'Second deposit', amount: 100, members: [{ user_id: 1, amount: 0 }, { user_id: 2, amount: 100 }] },
      ],
    });
    expect(created.status).toBe(201);
    const itemId = created.body.item.id;
    expect(created.body.item.installments.map((i: { members: unknown }) => i.members)).toEqual([
      [{ user_id: 1, amount: 100 }, { user_id: 2, amount: 100 }],
      [{ user_id: 1, amount: 0 }, { user_id: 2, amount: 100 }],
    ]);
    expect(created.body.item.members).toEqual([
      expect.objectContaining({ user_id: 1, amount: 419.65 }),
      expect.objectContaining({ user_id: 2, amount: 419.65 }),
    ]);
    const before = await request(server).get(`/api/trips/${tripId}/budget/settlement`).set('Cookie', sessionCookie(1));
    expect(before.status).toBe(200);
    const paid = await api().paid(itemId, created.body.item.installments[0].id, '2026-09-23');
    expect(paid.status).toBe(200);
    expect(paid.body.item).toMatchObject({ paid_amount: 200, open_amount: 639.30 });
    const after = await request(server).get(`/api/trips/${tripId}/budget/settlement`).set('Cookie', sessionCookie(1));
    expect(after.status).toBe(200);
    expect(after.body).toEqual(before.body);
  });

  it('rolls back deposits that exceed one member’s full share or have an invalid split', async () => {
    const body = {
      name: 'Shared stay', total_price: 839.30,
      members: [{ user_id: 1, amount: 419.65 }, { user_id: 2, amount: 419.65 }],
      installments: [
        { label: 'First', amount: 200, members: [{ user_id: 1, amount: 200 }] },
        { label: 'Second', amount: 300, members: [{ user_id: 1, amount: 300 }] },
      ],
    };
    const before = (db.prepare('SELECT COUNT(*) AS n FROM budget_items').get() as { n: number }).n;
    const over = await api().post(body);
    expect(over.status).toBe(400);
    expect(over.body.error).toMatch(/deposits exceed/);
    expect((db.prepare('SELECT COUNT(*) AS n FROM budget_items').get() as { n: number }).n).toBe(before);

    const wrongSum = await api().post({ ...body, installments: [{ label: 'Wrong', amount: 200, members: [{ user_id: 1, amount: 199.99 }] }] });
    expect(wrongSum.status).toBe(400);
    expect(wrongSum.body.error).toMatch(/split must add up/);
    const outsider = await api().post({ ...body, members: [{ user_id: 1, amount: 839.30 }], installments: [{ label: 'Wrong', amount: 200, members: [{ user_id: 2, amount: 200 }] }] });
    expect(outsider.status).toBe(400);
    expect(outsider.body.error).toMatch(/not part of the expense split/);
  });

  it('rejects a member change that would leave a stale deposit allocation', async () => {
    const created = await api().post({
      name: 'Stay', total_price: 200,
      members: [{ user_id: 1, amount: 100 }, { user_id: 2, amount: 100 }],
      installments: [{ label: 'Deposit', amount: 100, members: [{ user_id: 1, amount: 50 }, { user_id: 2, amount: 50 }] }],
    });
    expect(created.status).toBe(201);
    const itemId = created.body.item.id;
    const changed = await request(server).put(`/api/trips/${tripId}/budget/${itemId}/members`)
      .set('Cookie', sessionCookie(1)).send({ user_ids: [1] });
    expect(changed.status).toBe(400);
    const current = await request(server).get(`/api/trips/${tripId}/budget`).set('Cookie', sessionCookie(1));
    expect(current.body.items.find((i: { id: number }) => i.id === itemId).members).toHaveLength(2);
  });

  it('an expense without installments is paid in full, as before', async () => {
    const res = await api().post({ name: 'Taxi', total_price: 20 });
    expect(res.body.item).toMatchObject({ installments: [], paid_amount: 20, open_amount: 0 });
  });

  it('accepts an unallocated deposit on a planning-only expense', async () => {
    const res = await api().post({ name: 'Planned ticket', total_price: 100, member_ids: [], installments: [{ label: 'Deposit', amount: 20, members: [] }] });
    expect(res.status).toBe(201);
    expect(res.body.item.installments[0].members).toEqual([]);
  });

  it('400 when the installments add up to more than the total, and nothing is written', async () => {
    const before = (db.prepare('SELECT COUNT(*) AS n FROM budget_items').get() as { n: number }).n;
    const res = await api().post({ ...hotel, total_price: 2999.99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/installments add up to 3000\.00, more than the expense total of 2999\.99/);
    expect((db.prepare('SELECT COUNT(*) AS n FROM budget_items').get() as { n: number }).n).toBe(before);
  });

  it('400 when the total is lowered below the installments; the item keeps its old total', async () => {
    const created = await api().post(hotel);
    const res = await api().put(created.body.item.id, { total_price: 2500 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/more than the expense total of 2500\.00/);
    const row = db.prepare('SELECT total_price FROM budget_items WHERE id = ?').get(created.body.item.id);
    expect(row).toEqual({ total_price: 3000 });
  });

  it('400 when the payers lower the total below the installments', async () => {
    const created = await api().post(hotel);
    const res = await request(server).put(`/api/trips/${tripId}/budget/${created.body.item.id}/payers`)
      .set('Cookie', sessionCookie(1)).send({ payers: [{ user_id: 1, amount: 100 }] });
    expect(res.status).toBe(400);
  });

  it('an update keeps rows by id, adds new rows and deletes the rows left out', async () => {
    const created = await api().post(hotel);
    const [deposit, remainder] = created.body.item.installments;
    const res = await api().put(created.body.item.id, {
      installments: [
        { id: remainder.id, label: 'Final payment', amount: 1500 },
        { label: 'Tourist tax', amount: 50, due_date: '2026-10-05' },
      ],
    });
    expect(res.status).toBe(200);
    const after = res.body.item.installments;
    expect(after.map((i: { id: number }) => i.id)[0]).toBe(remainder.id);
    expect(after[0]).toMatchObject({ label: 'Final payment', amount: 1500, due_date: '2026-10-01', sort_order: 0 });
    expect(after[1]).toMatchObject({ label: 'Tourist tax', amount: 50, sort_order: 1 });
    expect(db.prepare('SELECT id FROM budget_item_installments WHERE id = ?').get(deposit.id)).toBeUndefined();
    // Nothing paid any more, and 1450 of the total is not scheduled yet: all of it is open.
    expect(res.body.item).toMatchObject({ paid_amount: 0, open_amount: 3000 });
  });

  it('an id from another expense is not adopted', async () => {
    const a = await api().post(hotel);
    const b = await api().post({ name: 'Flight', total_price: 500 });
    const foreignId = a.body.item.installments[0].id;
    const res = await api().put(b.body.item.id, { installments: [{ id: foreignId, label: 'Hijack', amount: 100 }] });
    expect(res.status).toBe(200);
    expect(res.body.item.installments[0].id).not.toBe(foreignId);
    expect(db.prepare('SELECT budget_item_id, label FROM budget_item_installments WHERE id = ?').get(foreignId))
      .toEqual({ budget_item_id: a.body.item.id, label: 'Deposit' });
  });

  it('marks an installment paid and open again, and answers the whole item', async () => {
    const created = await api().post(hotel);
    const remainder = created.body.item.installments[1];
    const paid = await api().paid(created.body.item.id, remainder.id, '2026-09-23');
    expect(paid.status).toBe(200);
    expect(paid.body.item).toMatchObject({ paid_amount: 3000, open_amount: 0 });
    const reopened = await api().paid(created.body.item.id, remainder.id, null);
    expect(reopened.body.item.open_amount).toBe(2000);
  });

  it('404 marking an installment of another expense, 400 on a bad day, 403 without permission', async () => {
    const a = await api().post(hotel);
    const b = await api().post({ name: 'Flight', total_price: 500 });
    const missing = await api().paid(b.body.item.id, a.body.item.installments[0].id, '2026-09-23');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Installment not found' });

    const bad = await api().paid(a.body.item.id, a.body.item.installments[0].id, '23.09.2026');
    expect(bad.status).toBe(400);

    checkPermission.mockReturnValue(false);
    const denied = await api().paid(a.body.item.id, a.body.item.installments[0].id, null);
    expect(denied.status).toBe(403);
  });

  it('an estimate can carry planned installments', async () => {
    const res = await api().post({ ...hotel, cost_status: 'estimate' });
    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ cost_status: 'estimate', open_amount: 2000 });
  });

  it('deleting the expense deletes its installments', async () => {
    const created = await api().post(hotel);
    const del = await request(server).delete(`/api/trips/${tripId}/budget/${created.body.item.id}`).set('Cookie', sessionCookie(1));
    expect(del.status).toBe(200);
    const left = db.prepare('SELECT COUNT(*) AS n FROM budget_item_installments WHERE budget_item_id = ?').get(created.body.item.id);
    expect(left).toEqual({ n: 0 });
  });
});

/**
 * Boot migration: budget_item_installments (fork #6).
 *
 * Partial payments of an expense. The table is new, so the step has to be
 * re-runnable, has to leave existing expenses without installments, and has to
 * go with its expense when that is deleted.
 */
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';

function migratedDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createTables(db);
  db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (1, 'u', 'u@example.test', 'x')").run();
  db.prepare("INSERT INTO trips (id, user_id, title) VALUES (1, 1, 'T')").run();
  db.prepare("INSERT INTO budget_items (id, trip_id, name, total_price) VALUES (1, 1, 'Hotel', 3000)").run();
  runMigrations(db);
  return db;
}

describe('budget_item_installments migration', () => {
  it('MIGRATE-INSTALLMENTS-001: creates the table, and no existing expense has an installment', () => {
    const db = migratedDb();
    try {
      const cols = (db.prepare("SELECT name FROM pragma_table_info('budget_item_installments')").all() as { name: string }[]).map(c => c.name);
      expect(cols).toEqual(['id', 'budget_item_id', 'label', 'amount', 'due_date', 'paid_at', 'sort_order', 'created_at']);
      const memberCols = (db.prepare("SELECT name FROM pragma_table_info('budget_item_installment_members')").all() as { name: string }[]).map(c => c.name);
      expect(memberCols).toEqual(['installment_id', 'user_id', 'amount']);
      expect(db.prepare('SELECT COUNT(*) AS n FROM budget_item_installments').get()).toEqual({ n: 0 });
    } finally {
      db.close();
    }
  });

  it('MIGRATE-INSTALLMENTS-002: running the step twice keeps the rows', () => {
    const db = migratedDb();
    try {
      const installmentId = Number(db.prepare("INSERT INTO budget_item_installments (budget_item_id, label, amount) VALUES (1, 'Deposit', 1000)").run().lastInsertRowid);
      db.prepare('INSERT INTO budget_item_installment_members (installment_id, user_id, amount) VALUES (?, 1, 1000)').run(installmentId);
      const version = (db.prepare('SELECT version FROM schema_version').get() as { version: number }).version;
      db.prepare('UPDATE schema_version SET version = ?').run(version - 1);
      runMigrations(db);
      expect(db.prepare('SELECT label, amount FROM budget_item_installments').all()).toEqual([{ label: 'Deposit', amount: 1000 }]);
      expect(db.prepare('SELECT user_id, amount FROM budget_item_installment_members').all()).toEqual([{ user_id: 1, amount: 1000 }]);
    } finally {
      db.close();
    }
  });

  it('MIGRATE-INSTALLMENTS-003: deleting the expense deletes its installments; a zero amount is refused', () => {
    const db = migratedDb();
    try {
      const installmentId = Number(db.prepare("INSERT INTO budget_item_installments (budget_item_id, label, amount) VALUES (1, 'Deposit', 1000)").run().lastInsertRowid);
      db.prepare('INSERT INTO budget_item_installment_members (installment_id, user_id, amount) VALUES (?, 1, 1000)').run(installmentId);
      expect(() => db.prepare("INSERT INTO budget_item_installments (budget_item_id, label, amount) VALUES (1, 'x', 0)").run()).toThrow();
      db.prepare('DELETE FROM budget_items WHERE id = 1').run();
      expect(db.prepare('SELECT COUNT(*) AS n FROM budget_item_installments').get()).toEqual({ n: 0 });
      expect(db.prepare('SELECT COUNT(*) AS n FROM budget_item_installment_members').get()).toEqual({ n: 0 });
    } finally {
      db.close();
    }
  });
});

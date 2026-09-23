/**
 * Boot migration: budget_items.cost_status (fork #3).
 *
 * An expense is an estimate (a planned cost) or final (the real cost). Every
 * row written before the column existed is a real cost, so it has to come out
 * `final`, or the migration would pull existing expenses out of the settlement.
 */
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';

function dbWithExpense(): Database.Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');
  createTables(db);
  db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (1, 'u', 'u@example.test', 'x')").run();
  db.prepare("INSERT INTO trips (id, user_id, title) VALUES (1, 1, 'T')").run();
  db.prepare("INSERT INTO budget_items (id, trip_id, name, total_price) VALUES (1, 1, 'Old dinner', 42)").run();
  return db;
}

describe('budget_items cost_status migration', () => {
  it('MIGRATE-COST-STATUS-001: every pre-existing expense comes out final', () => {
    const db = dbWithExpense();
    try {
      runMigrations(db);
      const row = db.prepare('SELECT cost_status FROM budget_items WHERE id = 1').get() as { cost_status: string };
      expect(row.cost_status).toBe('final');
    } finally {
      db.close();
    }
  });

  it('MIGRATE-COST-STATUS-002: running the step twice is a no-op', () => {
    const db = dbWithExpense();
    try {
      runMigrations(db);
      db.prepare("UPDATE budget_items SET cost_status = 'estimate' WHERE id = 1").run();
      // Rewind so the last step replays against a table that already has the column.
      const version = (db.prepare('SELECT version FROM schema_version').get() as { version: number }).version;
      db.prepare('UPDATE schema_version SET version = ?').run(version - 1);
      runMigrations(db);

      const cols = db.prepare("SELECT name FROM pragma_table_info('budget_items') WHERE name = 'cost_status'").all();
      expect(cols).toHaveLength(1);
      expect((db.prepare('SELECT cost_status FROM budget_items WHERE id = 1').get() as { cost_status: string }).cost_status).toBe('estimate');
      expect((db.prepare('SELECT version FROM schema_version').get() as { version: number }).version).toBe(version);
    } finally {
      db.close();
    }
  });

  it('MIGRATE-COST-STATUS-003: the column refuses anything but estimate or final', () => {
    const db = dbWithExpense();
    try {
      runMigrations(db);
      expect(() => db.prepare("UPDATE budget_items SET cost_status = 'planned' WHERE id = 1").run()).toThrow();
      expect(() => db.prepare('UPDATE budget_items SET cost_status = NULL WHERE id = 1').run()).toThrow();
    } finally {
      db.close();
    }
  });
});

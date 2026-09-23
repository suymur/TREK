/**
 * Boot migration: cost_categories (fork #4).
 *
 * The table is new, so the step only has to create it, be re-runnable, keep
 * ids from being reused, and refuse a duplicate name in any letter case.
 */
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';

function migratedDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  createTables(db);
  runMigrations(db);
  db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (1, 'u', 'u@example.test', 'x')").run();
  return db;
}

const insert = (db: Database.Database, name: string) =>
  Number(db.prepare("INSERT INTO cost_categories (name, icon, color, created_by) VALUES (?, 'tag', '#000000', 1)").run(name).lastInsertRowid);

describe('cost_categories migration', () => {
  it('MIGRATE-COST-CATEGORIES-001: creates the table with its columns', () => {
    const db = migratedDb();
    try {
      const cols = (db.prepare("SELECT name FROM pragma_table_info('cost_categories')").all() as { name: string }[]).map((c) => c.name);
      expect(cols).toEqual(['id', 'name', 'icon', 'color', 'created_by', 'created_at', 'sort_order']);
    } finally {
      db.close();
    }
  });

  it('MIGRATE-COST-CATEGORIES-002: running the step twice keeps the rows', () => {
    const db = migratedDb();
    try {
      insert(db, 'Deko');
      const version = (db.prepare('SELECT version FROM schema_version').get() as { version: number }).version;
      db.prepare('UPDATE schema_version SET version = ?').run(version - 1);
      runMigrations(db);
      expect(db.prepare('SELECT name FROM cost_categories').all()).toEqual([{ name: 'Deko' }]);
    } finally {
      db.close();
    }
  });

  it('MIGRATE-COST-CATEGORIES-003: refuses a duplicate name in any case and never reuses an id', () => {
    const db = migratedDb();
    try {
      const first = insert(db, 'Deko');
      expect(() => insert(db, 'DEKO')).toThrow();
      db.prepare('DELETE FROM cost_categories WHERE id = ?').run(first);
      expect(insert(db, 'Kleidung')).toBeGreaterThan(first);
    } finally {
      db.close();
    }
  });

  it('MIGRATE-COST-CATEGORIES-004: a deleted creator leaves the category behind', () => {
    const db = migratedDb();
    try {
      const id = insert(db, 'Deko');
      db.prepare('DELETE FROM users WHERE id = 1').run();
      expect(db.prepare('SELECT created_by FROM cost_categories WHERE id = ?').get(id)).toEqual({ created_by: null });
    } finally {
      db.close();
    }
  });
});

import type Database from "better-sqlite3";
import { SCHEMA_V1 } from "./schema";

/** Ordered list of migrations. Each entry's index+1 is its `user_version`.
 * Append new migrations here — never edit a migration that has already shipped. */
const MIGRATIONS: Array<(db: Database.Database) => void> = [
  (db) => {
    db.exec(SCHEMA_V1);
  },
];

/** Applies any migrations newer than the database's current `user_version`,
 * each inside its own transaction so a failure can't leave a half-applied schema. */
export function runMigrations(db: Database.Database): void {
  const current = db.pragma("user_version", { simple: true }) as number;

  for (let version = current; version < MIGRATIONS.length; version++) {
    const migrate = MIGRATIONS[version];
    const applyMigration = db.transaction(() => {
      migrate(db);
      db.pragma(`user_version = ${version + 1}`);
    });
    applyMigration();
  }
}

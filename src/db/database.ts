import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('sskhbg.db');

  return db;
}
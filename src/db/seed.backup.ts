import { getDb } from './database';

export async function initializeDatabase() {
  const db = await getDb();

  console.log('Init DB');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT,
      slug TEXT,
      category TEXT,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      group_name TEXT,
      indication TEXT,
      dosage TEXT,
      administration TEXT,
      monitoring_level TEXT,
      high_risk TEXT
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT
    );
  `);

  const modulesCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM modules'
  );

  const medicationsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM medications'
  );

  const cardsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cards'
  );

  console.log('DB COUNT modules', modulesCount);
  console.log('DB COUNT medications', medicationsCount);
  console.log('DB COUNT cards', cardsCount);

  console.log('DB klar');
}
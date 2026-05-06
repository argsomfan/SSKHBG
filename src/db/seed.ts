import { getDb } from './database';

const bundle = require('../data/generated/content_bundle.json');

export async function initializeDatabase() {
  const db = await getDb();

  console.log('Init DB');

  await db.execAsync(`
    DROP TABLE IF EXISTS modules;

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      summary TEXT
    );
  `);

  const modules = bundle.modules || [];

  for (const mod of modules) {
    await db.runAsync(
      `
      INSERT OR REPLACE INTO modules (
        id,
        title,
        category,
        summary
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        mod.module_id || '',
        mod.title || '',
        mod.category || '',
        mod.summary?.ingress || ''
      ]
    );
  }

  const count = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM modules`
  );

  console.log('DB COUNT modules', count);

  console.log('DB klar');
}
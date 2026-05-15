import { getDb } from './database';

const bundle = require('../data/generated/content_bundle.json');
const sepsisCards = require('../../content/cards/sepsis_cards.json');

type ContentRecord = Record<string, unknown>;

const metaKeys = new Set([
  'module_id',
  'type',
  'app',
  'language',
  'title',
  'category',
  'summary',
  'source_note',
  'tags'
]);

const sectionTitles: Record<string, string> = {
  definition: 'Definition',
  orsaker_och_riskfaktorer: 'Orsaker och riskfaktorer',
  symtom: 'Symtom',
  status: 'Status',
  diagnostik: 'Diagnostik',
  behandling: 'Behandling',
  omvardnad: 'Omvårdnad',
  overvakning: 'Övervakning',
  komplikationer: 'Komplikationer',
  eskalering: 'Eskalering',
  praktiska_punkter: 'Praktiska punkter',
  referenser: 'Referenser',
  lakemedel: 'Läkemedel',
  syfte: 'Syfte',
  indikationer: 'Indikationer',
  forberedelser: 'Förberedelser',
  genomforande: 'Genomförande',
  observationer: 'Observationer',
  risker_och_forsiktighet: 'Risker och försiktighet',
  patientinformation: 'Patientinformation',
  dokumentation: 'Dokumentation',
  nar_eskalera: 'När eskalera'
};

function valueToString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeKey(value: unknown) {
  return valueToString(value)
    .toLocaleLowerCase('sv-SE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function bestText(current: unknown, next: unknown) {
  const currentText = valueToString(current).trim();
  const nextText = valueToString(next).trim();

  if (!currentText) return nextText;
  if (!nextText) return currentText;

  return nextText.length > currentText.length ? nextText : currentText;
}

function dedupeMedications(drugs: ContentRecord[]) {
  const byName = new Map<string, ContentRecord>();

  for (const drug of drugs) {
    const key = normalizeKey(drug.name);
    if (!key) continue;

    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, drug);
      continue;
    }

    byName.set(key, {
      ...existing,
      name: bestText(existing.name, drug.name),
      group_name: bestText(existing.group_name, drug.group_name),
      indication: bestText(existing.indication, drug.indication),
      pharmacodynamics: bestText(existing.pharmacodynamics, drug.pharmacodynamics),
      dosage: bestText(existing.dosage, drug.dosage),
      dilution: bestText(existing.dilution, drug.dilution),
      administration: bestText(existing.administration, drug.administration),
      infusion_time: bestText(existing.infusion_time, drug.infusion_time),
      administration_time: bestText(
        existing.administration_time,
        drug.administration_time
      ),
      usage_time: bestText(existing.usage_time, drug.usage_time),
      side_effects: bestText(existing.side_effects, drug.side_effects),
      notes: bestText(existing.notes, drug.notes),
      monitoring_level: bestText(existing.monitoring_level, drug.monitoring_level),
      high_risk: bestText(existing.high_risk, drug.high_risk),
      source: bestText(existing.source, drug.source)
    });
  }

  return Array.from(byName.values()).sort((a, b) =>
    valueToString(a.name).localeCompare(valueToString(b.name), 'sv')
  );
}

function summaryText(item: ContentRecord) {
  const summary = item.summary as { ingress?: unknown } | undefined;
  return valueToString(summary?.ingress);
}

function idFor(item: ContentRecord, fallbackPrefix: string, index: number) {
  return valueToString(item.module_id) || `${fallbackPrefix}_${index + 1}`;
}

function titleFor(key: string) {
  return sectionTitles[key] || key.replace(/_/g, ' ');
}

function sectionEntries(item: ContentRecord) {
  return Object.entries(item).filter(([key, value]) => {
    return !metaKeys.has(key) && Array.isArray(value) && value.length > 0;
  }) as [string, unknown[]][];
}

async function seedModuleSections(
  db: Awaited<ReturnType<typeof getDb>>,
  moduleId: string,
  item: ContentRecord
) {
  const entries = sectionEntries(item);

  for (let sectionIndex = 0; sectionIndex < entries.length; sectionIndex += 1) {
    const [key, values] = entries[sectionIndex];
    const result = await db.runAsync(
      `
      INSERT INTO sections (module_id, title, sort_order)
      VALUES (?, ?, ?)
      `,
      [moduleId, titleFor(key), sectionIndex + 1]
    );

    const sectionId = result.lastInsertRowId;
    for (let itemIndex = 0; itemIndex < values.length; itemIndex += 1) {
      await db.runAsync(
        `
        INSERT INTO section_items (section_id, content, sort_order)
        VALUES (?, ?, ?)
        `,
        [sectionId, valueToString(values[itemIndex]), itemIndex + 1]
      );
    }
  }
}

async function seedTextSections(
  db: Awaited<ReturnType<typeof getDb>>,
  tableName: 'pm_sections' | 'nursing_sections',
  moduleId: string,
  item: ContentRecord
) {
  const entries = sectionEntries(item);

  for (let index = 0; index < entries.length; index += 1) {
    const [key, values] = entries[index];
    await db.runAsync(
      `
      INSERT INTO ${tableName} (module_id, title, content, sort_order)
      VALUES (?, ?, ?, ?)
      `,
      [
        moduleId,
        titleFor(key),
        values.map(valueToString).filter(Boolean).join('\n'),
        index + 1
      ]
    );
  }
}

export async function initializeDatabase() {
  const db = await getDb();

  console.log('Init DB');

  await db.execAsync(`
    DROP TABLE IF EXISTS card_items;
    DROP TABLE IF EXISTS cards;
    DROP TABLE IF EXISTS nursing_sections;
    DROP TABLE IF EXISTS nursing_modules;
    DROP TABLE IF EXISTS pm_sections;
    DROP TABLE IF EXISTS pm_modules;
    DROP TABLE IF EXISTS medications;
    DROP TABLE IF EXISTS section_items;
    DROP TABLE IF EXISTS sections;
    DROP TABLE IF EXISTS modules;

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      slug TEXT,
      title TEXT,
      category TEXT,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT,
      title TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS section_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section_id INTEGER,
      content TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      group_name TEXT,
      indication TEXT,
      pharmacodynamics TEXT,
      dosage TEXT,
      dilution TEXT,
      administration TEXT,
      infusion_time TEXT,
      administration_time TEXT,
      usage_time TEXT,
      side_effects TEXT,
      notes TEXT,
      monitoring_level TEXT,
      high_risk TEXT,
      source TEXT
    );

    CREATE TABLE IF NOT EXISTS pm_modules (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS pm_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT,
      title TEXT,
      content TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS nursing_modules (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      summary TEXT
    );

    CREATE TABLE IF NOT EXISTS nursing_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id TEXT,
      title TEXT,
      content TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS card_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id TEXT,
      content TEXT,
      sort_order INTEGER
    );
  `);

  const modules = (bundle.modules || []) as ContentRecord[];
  for (let index = 0; index < modules.length; index += 1) {
    const mod = modules[index];
    const id = idFor(mod, 'module', index);

    await db.runAsync(
      `
      INSERT OR REPLACE INTO modules (id, slug, title, category, summary)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        id,
        valueToString(mod.title),
        valueToString(mod.category),
        summaryText(mod)
      ]
    );

    await seedModuleSections(db, id, mod);
  }

  const rawDrugs = (Array.isArray(bundle.drugs_word?.[0])
    ? bundle.drugs_word[0]
    : bundle.drugs_word || []) as ContentRecord[];
  const drugs = dedupeMedications(rawDrugs);

  console.log('DB medications dedupe', {
    before: rawDrugs.length,
    after: drugs.length
  });

  for (const drug of drugs) {
    await db.runAsync(
      `
      INSERT INTO medications (
        name,
        group_name,
        indication,
        pharmacodynamics,
        dosage,
        dilution,
        administration,
        infusion_time,
        administration_time,
        usage_time,
        side_effects,
        notes,
        monitoring_level,
        high_risk,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        valueToString(drug.name),
        valueToString(drug.group_name),
        valueToString(drug.indication),
        valueToString(drug.pharmacodynamics),
        valueToString(drug.dosage),
        valueToString(drug.dilution),
        valueToString(drug.administration),
        valueToString(drug.infusion_time),
        valueToString(drug.administration_time),
        valueToString(drug.usage_time),
        valueToString(drug.side_effects),
        valueToString(drug.notes),
        valueToString(drug.monitoring_level),
        valueToString(drug.high_risk),
        valueToString(drug.source)
      ]
    );
  }

  const pmModules = (bundle.pm || []) as ContentRecord[];
  for (let index = 0; index < pmModules.length; index += 1) {
    const pm = pmModules[index];
    const id = idFor(pm, 'pm', index);

    await db.runAsync(
      `
      INSERT OR REPLACE INTO pm_modules (id, title, category, summary)
      VALUES (?, ?, ?, ?)
      `,
      [id, valueToString(pm.title), valueToString(pm.category), summaryText(pm)]
    );

    await seedTextSections(db, 'pm_sections', id, pm);
  }

  const nursingModules = (bundle.nursing || []) as ContentRecord[];
  for (let index = 0; index < nursingModules.length; index += 1) {
    const nursing = nursingModules[index];
    const id = idFor(nursing, 'nursing', index);

    await db.runAsync(
      `
      INSERT OR REPLACE INTO nursing_modules (id, title, category, summary)
      VALUES (?, ?, ?, ?)
      `,
      [
        id,
        valueToString(nursing.title),
        valueToString(nursing.category),
        summaryText(nursing)
      ]
    );

    await seedTextSections(db, 'nursing_sections', id, nursing);
  }

  for (const card of sepsisCards as ContentRecord[]) {
    const cardId = valueToString(card.id);
    const items = Array.isArray(card.items) ? card.items : [];

    await db.runAsync(
      `
      INSERT OR REPLACE INTO cards (id, title, category)
      VALUES (?, ?, ?)
      `,
      [cardId, valueToString(card.title), valueToString(card.category)]
    );

    for (let index = 0; index < items.length; index += 1) {
      await db.runAsync(
        `
        INSERT INTO card_items (card_id, content, sort_order)
        VALUES (?, ?, ?)
        `,
        [cardId, valueToString(items[index]), index + 1]
      );
    }
  }

  const modulesCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM modules`
  );
  const medicationsCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM medications`
  );
  const pmCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM pm_modules`
  );
  const nursingCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM nursing_modules`
  );
  const cardsCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM cards`
  );

  console.log('DB COUNT modules', modulesCount);
  console.log('DB COUNT medications', medicationsCount);
  console.log('DB COUNT pm_modules', pmCount);
  console.log('DB COUNT nursing_modules', nursingCount);
  console.log('DB COUNT cards', cardsCount);

  console.log('DB klar');
}

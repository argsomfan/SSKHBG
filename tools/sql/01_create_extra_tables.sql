CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  title TEXT,
  slug TEXT,
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

CREATE TABLE IF NOT EXISTS pm_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  summary TEXT,
  tags TEXT,
  difficulty TEXT,
  author TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS pm_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pm_id TEXT NOT NULL,
  heading TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  group_name TEXT,
  mechanism TEXT,
  indication TEXT,
  dosage TEXT,
  dilution TEXT,
  infusion_time TEXT,
  administration TEXT,
  monitoring TEXT,
  contraindications TEXT,
  side_effects TEXT,
  nursing TEXT,
  references_text TEXT,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS nursing_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  summary TEXT,
  tags TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS nursing_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nursing_id TEXT NOT NULL,
  heading TEXT NOT NULL,
  content TEXT,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  summary TEXT,
  color_theme TEXT,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS card_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS calculators (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  formula TEXT,
  unit TEXT,
  description TEXT,
  warning_text TEXT,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT,
  note TEXT
);

CREATE VIEW IF NOT EXISTS search_index AS
SELECT id, title, summary AS content, category AS tags, 'Diagnos' AS type FROM modules
UNION ALL
SELECT id, title, summary AS content, tags, 'PM' AS type FROM pm_modules
UNION ALL
SELECT id, name AS title, indication AS content, tags, 'Läkemedel' AS type FROM medications
UNION ALL
SELECT id, title, summary AS content, tags, 'Omvårdnad' AS type FROM nursing_modules
UNION ALL
SELECT id, title, summary AS content, tags, 'Snabbkort' AS type FROM cards
UNION ALL
SELECT id, title, description AS content, tags, 'Kalkylator' AS type FROM calculators;

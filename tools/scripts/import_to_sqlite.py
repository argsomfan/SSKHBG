import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "database/sskhbg.db"
SCHEMA = ROOT / "tools/sql/01_create_extra_tables.sql"

META_KEYS = {
    "module_id",
    "type",
    "app",
    "language",
    "title",
    "category",
    "summary",
    "source_note",
    "tags",
}

SECTION_TITLES = {
    "definition": "Definition",
    "orsaker_och_riskfaktorer": "Orsaker och riskfaktorer",
    "symtom": "Symtom",
    "status": "Status",
    "diagnostik": "Diagnostik",
    "behandling": "Behandling",
    "omvardnad": "Omvårdnad",
    "overvakning": "Övervakning",
    "komplikationer": "Komplikationer",
    "eskalering": "Eskalering",
    "praktiska_punkter": "Praktiska punkter",
    "referenser": "Referenser",
    "lakemedel": "Läkemedel",
    "syfte": "Syfte",
    "indikationer": "Indikationer",
    "forberedelser": "Förberedelser",
    "genomforande": "Genomförande",
    "observationer": "Observationer",
    "risker_och_forsiktighet": "Risker och försiktighet",
    "patientinformation": "Patientinformation",
    "dokumentation": "Dokumentation",
    "nar_eskalera": "När eskalera",
}


def text(value):
    if value is None:
        return ""
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def summary_text(data):
    summary = data.get("summary")
    if isinstance(summary, dict):
        return text(summary.get("ingress"))
    return text(summary)


def title_for(key):
    return SECTION_TITLES.get(key, key.replace("_", " ").capitalize())


def section_entries(data):
    return [
        (key, value)
        for key, value in data.items()
        if key not in META_KEYS and isinstance(value, list) and value
    ]


def insert_sections(cur, table, parent_column, parent_id, data):
    for index, (key, values) in enumerate(section_entries(data), start=1):
        cur.execute(
            f"""
            INSERT INTO {table}
            ({parent_column}, heading, content, sort_order)
            VALUES (?, ?, ?, ?)
            """,
            (
                parent_id,
                title_for(key),
                "\n".join(text(value) for value in values if text(value)),
                index,
            ),
        )


def insert_module_sections(cur, module_id, data):
    for section_index, (key, values) in enumerate(section_entries(data), start=1):
        result = cur.execute(
            """
            INSERT INTO sections (module_id, title, sort_order)
            VALUES (?, ?, ?)
            """,
            (module_id, title_for(key), section_index),
        )
        section_id = result.lastrowid
        for item_index, item in enumerate(values, start=1):
            cur.execute(
                """
                INSERT INTO section_items (section_id, content, sort_order)
                VALUES (?, ?, ?)
                """,
                (section_id, text(item), item_index),
            )


DB.parent.mkdir(parents=True, exist_ok=True)
if DB.exists():
    DB.unlink()

conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.executescript(SCHEMA.read_text(encoding="utf-8"))

for path in sorted((ROOT / "content/modules").glob("*.json")):
    data = read_json(path)
    module_id = text(data.get("module_id") or data.get("id") or path.stem)
    cur.execute(
        """
        INSERT OR REPLACE INTO modules (id, slug, title, category, summary)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            module_id,
            module_id,
            text(data.get("title")),
            text(data.get("category")),
            summary_text(data),
        ),
    )
    insert_module_sections(cur, module_id, data)

for path in sorted((ROOT / "content/pm").glob("*.json")):
    data = read_json(path)
    pm_id = text(data.get("id") or data.get("module_id") or path.stem)
    cur.execute(
        """
        INSERT INTO pm_modules (id, title, category, summary, tags)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            pm_id,
            text(data.get("title")),
            text(data.get("category")),
            summary_text(data),
            text(data.get("tags")),
        ),
    )
    insert_sections(cur, "pm_sections", "pm_id", pm_id, data)

med_file = ROOT / "content/drugs/medications.json"
if med_file.exists():
    for med in read_json(med_file):
        med_id = text(med.get("id") or med.get("name") or med.get("title"))
        cur.execute(
            """
            INSERT OR REPLACE INTO medications (
              id, name, generic_name, group_name, mechanism, indication,
              dosage, dilution, infusion_time, administration, monitoring,
              contraindications, side_effects, nursing, references_text, tags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                med_id,
                text(med.get("name") or med.get("title")),
                text(med.get("generic_name")),
                text(med.get("group_name") or med.get("category")),
                text(med.get("mechanism") or med.get("pharmacodynamics")),
                text(med.get("indication")),
                text(med.get("dosage")),
                text(med.get("dilution")),
                text(med.get("infusion_time")),
                text(med.get("administration")),
                text(med.get("monitoring") or med.get("monitoring_level")),
                text(med.get("contraindications")),
                text(med.get("side_effects")),
                text(med.get("nursing") or med.get("notes")),
                text(med.get("references_text") or med.get("source")),
                text(med.get("tags")),
            ),
        )

for path in sorted((ROOT / "content/nursing").glob("*.json")):
    data = read_json(path)
    nursing_id = text(data.get("id") or data.get("module_id") or path.stem)
    cur.execute(
        """
        INSERT INTO nursing_modules (id, title, category, summary, tags)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            nursing_id,
            text(data.get("title")),
            text(data.get("category")),
            summary_text(data),
            text(data.get("tags")),
        ),
    )
    insert_sections(cur, "nursing_sections", "nursing_id", nursing_id, data)

for path in sorted((ROOT / "content/cards").glob("*.json")):
    data = read_json(path)
    cards = data if isinstance(data, list) else [data]

    for card in cards:
        items = card.get("items", [])
        card_id = text(card.get("id") or card.get("title"))
        cur.execute(
            """
            INSERT INTO cards (id, title, category, summary, tags)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                card_id,
                text(card.get("title")),
                text(card.get("category")),
                "\n".join(text(item) for item in items[:3]),
                text(card.get("tags")),
            ),
        )
        for index, item in enumerate(items, start=1):
            cur.execute(
                """
                INSERT INTO card_items (card_id, content, sort_order)
                VALUES (?, ?, ?)
                """,
                (card_id, text(item), index),
            )

for path in sorted((ROOT / "content/calculators").glob("*.json")):
    data = read_json(path)
    calculators = data if isinstance(data, list) else [data]
    for calculator in calculators:
        calculator_id = text(calculator.get("id") or calculator.get("title") or path.stem)
        cur.execute(
            """
            INSERT OR REPLACE INTO calculators (
              id, title, category, formula, unit, description, warning_text, tags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                calculator_id,
                text(calculator.get("title")),
                text(calculator.get("category")),
                text(calculator.get("formula")),
                text(calculator.get("unit")),
                text(calculator.get("description")),
                text(calculator.get("warning_text")),
                text(calculator.get("tags")),
            ),
        )

conn.commit()

print(f"IMPORT KLAR: {DB}")
for table in [
    "modules",
    "sections",
    "section_items",
    "pm_modules",
    "pm_sections",
    "medications",
    "nursing_modules",
    "nursing_sections",
    "cards",
    "card_items",
    "calculators",
]:
    count = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"{table}: {count}")

conn.close()

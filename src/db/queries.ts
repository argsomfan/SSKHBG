import { getDb } from './database';

export async function getAllModules() {
  try {
    const db = await getDb();
    const result = await db.getAllAsync(
      'SELECT id, title, slug, category, summary FROM modules ORDER BY title'
    );
    return result as {
      id: string;
      title: string;
      slug: string;
      category: string;
      summary: string;
    }[];
  } catch (e) {
    console.log('DB ERROR getAllModules:', e);
    return [];
  }
}

export async function getModuleBySlug(slug: string) {
  try {
    const db = await getDb();

    const moduleRow = await db.getFirstAsync(
      'SELECT id, title, slug, category, summary FROM modules WHERE slug = ? LIMIT 1',
      [slug]
    ) as
      | {
          id: string;
          title: string;
          slug: string;
          category: string;
          summary: string;
        }
      | null;

    if (!moduleRow) {
      console.log('Ingen moduleRow hittades för slug:', slug);
      return null;
    }

    const rows = await db.getAllAsync(
      `
      SELECT
        sections.id as section_id,
        sections.title as section_title,
        sections.sort_order as section_sort_order,
        section_items.content as item_content,
        section_items.sort_order as item_sort_order
      FROM sections
      LEFT JOIN section_items
        ON section_items.section_id = sections.id
      WHERE sections.module_id = ?
      ORDER BY sections.sort_order ASC, section_items.sort_order ASC
      `,
      [moduleRow.id]
    ) as {
      section_id: number;
      section_title: string;
      section_sort_order: number;
      item_content: string;
      item_sort_order: number;
    }[];

    const groupedSections: {
      title: string;
      sort_order: number;
      items: string[];
    }[] = [];

    for (const row of rows) {
      let section = groupedSections.find(
        (s) => s.title === row.section_title
      );

      if (!section) {
        section = {
          title: row.section_title,
          sort_order: row.section_sort_order,
          items: []
        };
        groupedSections.push(section);
      }

      if (row.item_content) {
        section.items.push(row.item_content);
      }
    }

    return {
      ...moduleRow,
      sections: groupedSections
    };
  } catch (e) {
    console.log('DB ERROR getModuleBySlug:', e);
    return null;
  }
}
export async function getAllMedications() {
  try {
    const db = await getDb();

    const rows = await db.getAllAsync(
      `
      SELECT
        id,
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
      FROM medications
      ORDER BY name ASC
      `
    );

    return rows as {
      id: number;
      name: string;
      group_name: string;
      indication: string;
      pharmacodynamics: string;
      dosage: string;
      dilution: string;
      administration: string;
      infusion_time: string;
      administration_time: string;
      usage_time: string;
      side_effects: string;
      notes: string;
      monitoring_level: string;
      high_risk: string;
      source: string;
    }[];
  } catch (e) {
    console.log('DB ERROR getAllMedications:', e);
    return [];
  }
}
export async function getMedicationById(id: number) {
  try {
    const db = await getDb();

    const row = await db.getFirstAsync(
      `
      SELECT
        id,
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
      FROM medications
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return row as
      | {
          id: number;
          name: string;
          group_name: string;
          indication: string;
          pharmacodynamics: string;
          dosage: string;
          dilution: string;
          administration: string;
          infusion_time: string;
          administration_time: string;
          usage_time: string;
          side_effects: string;
          notes: string;
          monitoring_level: string;
          high_risk: string;
          source: string;
        }
      | null;
  } catch (e) {
    console.log('DB ERROR getMedicationById:', e);
    return null;
  }
}
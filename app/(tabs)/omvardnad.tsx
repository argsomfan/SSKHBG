import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDb } from '../../src/db/database';
import { Colors } from '../../src/theme';

type Block = {
  title: string;
  items: string[];
};

export default function OmvardnadScreen() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const modules = await db.getAllAsync(
        `SELECT id, title FROM pm_modules ORDER BY title ASC`
      ) as { id: string; title: string }[];

      const next: Block[] = [];

      for (const mod of modules) {
        const sections = await db.getAllAsync(
          `SELECT title, content
           FROM pm_sections
           WHERE module_id = ?
           AND (
             title LIKE '%Omvårdnad%'
             OR title LIKE '%Övervakning%'
           )`,
          [mod.id]
        ) as { title: string; content: string }[];

        if (!sections.length) continue;

        const items: string[] = [];

        for (const sec of sections) {
          const lines = sec.content
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

          items.push(...lines);
        }

        if (!items.length) continue;

        next.push({
          title: `Omvårdnadsåtgärder – ${mod.title}`,
          items
        });
      }

      setBlocks(next);
    }

    load().catch((e) => {
      console.log('OMVARDNAD ERROR', e);
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Omvårdnad</Text>

      {blocks.map((block, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{block.title}</Text>

          {block.items.map((item, j) => (
            <Text key={j} style={styles.cardText}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },

  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 18
  },

  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12
  },

  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10
  },

  cardText: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6
  }
});

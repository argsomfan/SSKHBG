import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getDb } from '../../src/db/database';

type Section = {
  title: string;
  content: string;
};

export default function PMDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

     const mod = await db.getFirstAsync<{ title: string }>(
  `SELECT title FROM pm_modules WHERE id = ?`,
  [id]
);

if (mod?.title) setTitle(mod.title);

      const rows = await db.getAllAsync(
        `SELECT title, content
         FROM pm_sections
         WHERE module_id = ?
         ORDER BY sort_order ASC`,
        [id]
      ) as Section[];

      setSections(rows);
    }

    if (id) load();
  }, [id]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>

      {sections.map((section, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>

          {section.content.split('\n').map((line, i) => (
            <Text key={i} style={styles.text}>
              • {line}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8
  },

  text: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4
  }
});
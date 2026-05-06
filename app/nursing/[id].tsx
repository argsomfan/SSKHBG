import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getDb } from '../../src/db/database';

type NursingSection = {
  title: string;
  content: string;
  sort_order: number;
};

type NursingModule = {
  id: string;
  title: string;
  category: string;
  summary: string;
};

export default function NursingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [moduleData, setModuleData] = useState<NursingModule | null>(null);
  const [sections, setSections] = useState<NursingSection[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const db = await getDb();

      const mod = await db.getFirstAsync(
        `SELECT id, title, category, summary
         FROM nursing_modules
         WHERE id = ?
         LIMIT 1`,
        [id]
      ) as NursingModule | null;

      const rows = await db.getAllAsync(
        `SELECT title, content, sort_order
         FROM nursing_sections
         WHERE module_id = ?
         ORDER BY sort_order ASC`,
        [id]
      ) as NursingSection[];

      setModuleData(mod);
      setSections(rows);
    }

    load().catch((e) => {
      console.log('NURSING DETAIL ERROR', e);
    });
  }, [id]);

  if (!moduleData) {
    return (
      <View style={styles.center}>
        <Text>Laddar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{moduleData.title}</Text>
      <Text style={styles.category}>{moduleData.category}</Text>
      <Text style={styles.summary}>{moduleData.summary}</Text>

      {sections.map((section, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.cardText}>{section.content}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4
  },

  category: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8
  },

  summary: {
    fontSize: 15,
    color: '#222',
    marginBottom: 16
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6
  },

  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#222'
  }
});
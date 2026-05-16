import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { BackButton } from '../../src/components/BackButton';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type NursingModule = {
  id: string;
  title: string;
  summary: string;
};

type NursingSection = {
  id: number;
  nursing_id: string;
  heading: string;
  content: string;
  sort_order: number;
};

export default function NursingDetailScreen() {
  const params = useLocalSearchParams();
  const moduleId = String(params.id ?? '');

  const [module, setModule] = useState<NursingModule | null>(null);
  const [sections, setSections] = useState<NursingSection[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const row = await db.getFirstAsync<NursingModule>(
        `SELECT id, title, summary
         FROM nursing_modules
         WHERE id = ?`,
        [moduleId]
      );

      const sectionRows = await db.getAllAsync<NursingSection>(
        `SELECT id, nursing_id, heading, content, sort_order
         FROM nursing_sections
         WHERE nursing_id = ?
         ORDER BY sort_order ASC`,
        [moduleId]
      );

      setModule(row ?? null);
      setSections(sectionRows);
    }

    if (moduleId) {
      load().catch((e) => {
        console.log('NURSING DETAIL ERROR', e);
      });
    }
  }, [moduleId]);

  if (!module) {
    return (
      <Screen>
        <Text style={styles.loading}>Laddar omvårdnad...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton fallbackPath="/omvardnad" />

      <Text style={styles.title}>{module.title}</Text>

      {!!module.summary && (
        <Text style={styles.summary}>{module.summary}</Text>
      )}

      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.heading}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    fontSize: 16,
    color: Colors.textSecondary
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12
  },

  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: 24
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 12
  },

  sectionContent: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary
  }
});

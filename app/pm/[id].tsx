import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type PMModule = {
  id: string;
  title: string;
  summary: string;
};

type PMSection = {
  id: number;
  pm_id: string;
  heading: string;
  content: string;
  sort_order: number;
};

export default function PMDetailScreen() {
  const params = useLocalSearchParams();
  const pmId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [pm, setPm] = useState<PMModule | null>(null);
  const [sections, setSections] = useState<PMSection[]>([]);

  useEffect(() => {
    async function load() {
      if (!pmId) return;

      const db = await getDb();

      const row = await db.getFirstAsync<PMModule>(
        `
        SELECT id, title, summary
        FROM pm_modules
        WHERE id = ?
        `,
        [pmId]
      );

      const sectionRows = await db.getAllAsync<PMSection>(
        `
        SELECT *
        FROM pm_sections
        WHERE pm_id = ?
        ORDER BY sort_order ASC
        `,
        [pmId]
      );

      setPm(row ?? null);
      setSections(sectionRows);
    }

    load().catch((e) => {
      console.log('PM DETAIL ERROR', e);
    });
  }, [pmId]);

  if (!pm) {
    return (
      <Screen>
        <Text style={styles.loading}>
          Laddar PM...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {pm.title}
        </Text>

        {!!pm.summary && (
          <View style={styles.quickCard}>
            <Text style={styles.quickTitle}>
              Snabbfakta
            </Text>

            <Text style={styles.summary}>
              {pm.summary}
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.buttonRow}
        >
          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>
              Algoritm
            </Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>
              Omvårdnad
            </Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>
              Läkemedel
            </Text>
          </Pressable>

          <Pressable style={styles.actionButton}>
            <Text style={styles.actionText}>
              Övervakning
            </Text>
          </Pressable>
        </ScrollView>

        {sections.map((section) => (
          <View
            key={section.id}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              {section.heading}
            </Text>

            <Text style={styles.sectionContent}>
              {section.content}
            </Text>
          </View>
        ))}
      </ScrollView>
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
    marginBottom: 18
  },

  quickCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border
  },

  quickTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 10,
    letterSpacing: 1
  },

  summary: {
    fontSize: 16,
    lineHeight: 25,
    color: Colors.textPrimary
  },

  buttonRow: {
    marginBottom: 22
  },

  actionButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border
  },

  actionText: {
    color: Colors.textPrimary,
    fontWeight: '700'
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 14
  },

  sectionContent: {
    fontSize: 15,
    lineHeight: 26,
    color: Colors.textPrimary
  }
});
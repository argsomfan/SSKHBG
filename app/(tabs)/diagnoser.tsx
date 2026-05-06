import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type PMItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
};

export default function DiagnoserScreen() {
  const [data, setData] = useState<PMItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const db = await getDb();

        const rows = await db.getAllAsync(
          `SELECT id, title, slug, category, summary
           FROM modules
           ORDER BY category, title ASC`
        ) as PMItem[];

        setData(rows);
      } catch (e) {
        console.log('LOAD ERROR', e);
      }
    }

    load();
  }, []);

  return (
    <Screen>
      <Text style={styles.title}>Diagnoser</Text>

      <Text style={styles.subtitle}>
        {data.length} diagnoser
      </Text>

      {data.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => router.push(`/module/${item.slug}` as any)}
        >
          <View>
            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            {!!item.summary && (
              <Text style={styles.cardSummary}>
                {item.summary}
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4
  },

  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 22
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6
  },

  cardSummary: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary
  }
});
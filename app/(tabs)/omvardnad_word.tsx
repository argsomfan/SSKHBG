import { useEffect, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { getDb } from '../../src/db/database';
import { Colors } from '../../src/theme';

type NursingItem = {
  id: string;
  title: string;
  category: string;
  summary: string;
};

export default function OmvardnadWordScreen() {
  const [data, setData] = useState<NursingItem[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const rows = await db.getAllAsync(
        `SELECT id, title, category, summary FROM nursing_modules ORDER BY title ASC`
      ) as NursingItem[];

      setData(rows);
    }

    load().catch((e) => {
      console.log('NURSING LIST ERROR', e);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Omvårdnad PM ({data.length})</Text>
      {data.length === 0 ? (
        <Text style={styles.emptyText}>
          Inga omvårdnads-PM hittades i databasen.
        </Text>
      ) : null}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/nursing/${item.id}`)}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
            <Text style={styles.cardSummary}>{item.summary}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 60
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 28
  },
  emptyText: {
    color: Colors.textSecondary,
    marginBottom: 12
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  cardCategory: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6
  },
  cardSummary: {
    fontSize: 15,
    color: Colors.textPrimary
  }
});

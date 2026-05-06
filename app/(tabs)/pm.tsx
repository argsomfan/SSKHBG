import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { router } from 'expo-router';
import { getDb } from '../../src/db/database';
import { Colors } from '../../src/theme';

type PMItem = {
  id: string;
  title: string;
  category: string;
  summary: string;
};

export default function PMScreen() {
  const [data, setData] = useState<PMItem[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const rows = await db.getAllAsync(
        `SELECT id, title, category, summary
         FROM pm_modules
         ORDER BY category, title ASC`
      ) as PMItem[];

      setData(rows);
    }

    load().catch((e) => {
      console.log('PM LIST ERROR', e);
    });
  }, []);

  const grouped = data.reduce<Record<string, PMItem[]>>((acc, item) => {
    const category = item.category || 'ÖVRIGT';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>PM</Text>
      <Text style={styles.subtitle}>{data.length} behandlingsrutiner</Text>

      {Object.keys(grouped).map((category) => (
        <View key={category}>
          <Text style={styles.category}>{category.toUpperCase()}</Text>

          {grouped[category].map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/pm/${item.id}`)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>

              {item.summary ? (
                <Text style={styles.cardSummary}>{item.summary}</Text>
              ) : null}

              {item.title.toLowerCase().includes('hlr') ||
              item.title.toLowerCase().includes('sepsis') ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Akut</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40
  },

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

  category: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: 1
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6
  },

  cardSummary: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffe5e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },

  badgeText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12
  }
});
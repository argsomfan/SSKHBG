import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { getDb } from '../../src/db/database';
import { Colors } from '../../src/theme';

type Counts = {
  diagnoses: number;
  pm: number;
  nursing: number;
  cards: number;
};

const initialCounts: Counts = {
  diagnoses: 0,
  pm: 0,
  nursing: 0,
  cards: 0
};

const sections = [
  {
    key: 'diagnoses',
    title: 'Diagnoser',
    subtitle: 'Medicinska tillstånd, symtom, diagnostik och behandling.',
    route: '/diagnoser',
    label: 'kliniska moduler'
  },
  {
    key: 'pm',
    title: 'PM',
    subtitle: 'Lokala rutiner för handläggning, övervakning och eskalering.',
    route: '/pm',
    label: 'PM'
  },
  {
    key: 'nursing',
    title: 'Omvårdnad',
    subtitle: 'Omvårdnadsåtgärder och praktiska moment kopplade till vården.',
    route: '/omvardnad',
    label: 'omvårdnadsmoduler'
  },
  {
    key: 'cards',
    title: 'Snabbkort',
    subtitle: 'Korta checklistor för snabb repetition vid patientnära arbete.',
    route: '/cards',
    label: 'snabbkort'
  }
] as const;

async function countRows(tableName: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );

  return row?.count ?? 0;
}

export default function BibliotekScreen() {
  const [counts, setCounts] = useState<Counts>(initialCounts);

  useEffect(() => {
    async function loadCounts() {
      const [diagnoses, pm, nursing, cards] = await Promise.all([
        countRows('modules'),
        countRows('pm_modules'),
        countRows('nursing_modules'),
        countRows('cards')
      ]);

      setCounts({ diagnoses, pm, nursing, cards });
    }

    loadCounts().catch((error) => {
      console.log('BIBLIOTEK COUNT ERROR', error);
    });
  }, []);

  const total = counts.diagnoses + counts.pm + counts.nursing + counts.cards;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker} selectable>
          Bibliotek
        </Text>
        <Text style={styles.title} selectable>
          Kliniskt innehåll
        </Text>
        <Text style={styles.subtitle} selectable>
          {total} poster samlade i tydliga ingångar.
        </Text>
      </View>

      <Pressable
        style={styles.searchCard}
        onPress={() => router.push('/search' as never)}
      >
        <View style={styles.searchText}>
          <Text style={styles.searchTitle}>Sök direkt</Text>
          <Text style={styles.searchSubtitle}>Bra när du vet vad du letar efter.</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </Pressable>

      <View style={styles.grid}>
        {sections.map((item) => {
          const count = counts[item.key];

          return (
            <Pressable
              key={item.key}
              style={styles.card}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.count}>{count}</Text>
                <Text style={styles.arrowSmall}>›</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              <Text style={styles.cardMeta}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14
  },
  header: {
    gap: 6,
    paddingBottom: 2
  },
  kicker: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '900'
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 22
  },
  searchCard: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14
  },
  searchText: {
    flex: 1,
    gap: 4,
    paddingRight: 12
  },
  searchTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900'
  },
  searchSubtitle: {
    color: '#fff4f4',
    fontSize: 14,
    lineHeight: 19
  },
  arrow: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '300'
  },
  grid: {
    gap: 10
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  count: {
    color: Colors.primary,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    fontWeight: '900'
  },
  arrowSmall: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '300'
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    marginBottom: 5
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  cardMeta: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800'
  }
});

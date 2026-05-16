import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type Medication = {
  id: number;
  name: string;
  group_name: string;
  indication: string;
  dosage: string;
  dilution: string;
  administration: string;
  high_risk: string;
};

function normalize(value?: string | number) {
  return String(value ?? '').trim().toLocaleLowerCase('sv-SE');
}

function isHighRisk(value?: string) {
  const normalized = normalize(value);
  return Boolean(normalized && !['nej', 'no', 'false', '0'].includes(normalized));
}

export default function LakemedelScreen() {
  const [data, setData] = useState<Medication[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const rows = await db.getAllAsync(
        `SELECT id, name, group_name, indication, dosage, dilution, administration, high_risk
         FROM medications
         ORDER BY group_name ASC, name ASC`
      ) as Medication[];

      setData(rows);
    }

    load().catch((error) => {
      console.log('LAKEMEDEL ERROR', error);
    });
  }, []);

  const riskCount = useMemo(
    () => data.filter((item) => isHighRisk(item.high_risk)).length,
    [data]
  );

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return data;

    return data.filter((item) => {
      const haystack = normalize(
        [
          item.name,
          item.group_name,
          item.indication,
          item.dosage,
          item.dilution,
          item.administration,
          item.high_risk
        ].join(' ')
      );

      return haystack.includes(needle);
    });
  }, [data, query]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Medication[]>>((acc, item) => {
      const group = item.group_name || 'Övrigt';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  }, [filtered]);

  const groupNames = Object.keys(grouped);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker} selectable>
          Läkemedel
        </Text>
        <Text style={styles.title} selectable>
          Sök läkemedelskort
        </Text>
        <Text style={styles.subtitle} selectable>
          {data.length} läkemedel med dosering, spädning och administrering.
        </Text>
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Sök läkemedel, grupp, dos eller spädning"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{filtered.length}</Text>
          <Text style={styles.summaryLabel}>{query ? 'träffar' : 'visas'}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{groupNames.length}</Text>
          <Text style={styles.summaryLabel}>grupper</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{riskCount}</Text>
          <Text style={styles.summaryLabel}>risk</Text>
        </View>
      </View>

      {query ? (
        <Pressable style={styles.clearButton} onPress={() => setQuery('')}>
          <Text style={styles.clearText}>Rensa sökning</Text>
        </Pressable>
      ) : null}

      {groupNames.map((group) => (
        <View key={group} style={styles.groupBlock}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{group}</Text>
            <Text style={styles.groupCount}>{grouped[group].length}</Text>
          </View>

          {grouped[group].map((item) => {
            const highRisk = isHighRisk(item.high_risk);

            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/lakemedel/${item.id}` as never)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {highRisk ? (
                    <View style={styles.riskBadge}>
                      <Text style={styles.riskBadgeText}>Risk</Text>
                    </View>
                  ) : null}
                </View>

                {!!item.indication && (
                  <Text style={styles.cardText} numberOfLines={3}>
                    {item.indication}
                  </Text>
                )}

                {!!item.dosage && (
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Dos: {item.dosage}
                  </Text>
                )}

                {!!item.administration && (
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Admin: {item.administration}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      {data.length > 0 && filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Inga träffar</Text>
          <Text style={styles.emptyText}>Prova läkemedelsnamn, dos, grupp eller spädning.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12
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
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  summaryValue: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '900'
  },
  summaryLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  clearButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  clearText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800'
  },
  groupBlock: {
    gap: 8,
    paddingTop: 8
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  groupTitle: {
    color: Colors.primary,
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.7,
    paddingRight: 10,
    textTransform: 'uppercase'
  },
  groupCount: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '800'
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 14
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  cardTitle: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 23
  },
  riskBadge: {
    backgroundColor: Colors.dangerSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  riskBadgeText: {
    color: Colors.dangerText,
    fontSize: 12,
    fontWeight: '900'
  },
  cardText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  cardSub: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 34
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 5
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
});

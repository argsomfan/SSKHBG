import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type Medication = {
  id: number;
  name: string;
  group_name: string;
  indication: string;
  dosage: string;
  administration: string;
};

export default function LakemedelScreen() {
  const [data, setData] = useState<Medication[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const rows = await db.getAllAsync(
        `SELECT id, name, group_name, indication, dosage, administration
         FROM medications
         ORDER BY group_name ASC, name ASC`
      ) as Medication[];

      setData(rows);
    }

    load().catch((e) => {
      console.log('LAKEMEDEL ERROR', e);
    });
  }, []);

  const grouped = data.reduce<Record<string, Medication[]>>((acc, item) => {
    const group = item.group_name || 'ÖVRIGT';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <Screen>
      <Text style={styles.title}>Läkemedel</Text>
      <Text style={styles.subtitle}>{data.length} läkemedel</Text>

      {Object.keys(grouped).map((group) => (
        <View key={group}>
          <Text style={styles.groupTitle}>{group.toUpperCase()}</Text>

          {grouped[group].map((item) => (
            <Pressable key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>

              {!!item.indication && (
                <Text style={styles.cardText}>{item.indication}</Text>
              )}

              {!!item.dosage && (
                <Text style={styles.cardSub}>Dos: {item.dosage}</Text>
              )}

              {!!item.administration && (
                <Text style={styles.cardSub}>Admin: {item.administration}</Text>
              )}
            </Pressable>
          ))}
        </View>
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

  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },

  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6
  },

  cardText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 8
  },

  cardSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4
  }
});
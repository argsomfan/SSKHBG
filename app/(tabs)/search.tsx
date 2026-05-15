import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from 'convex/react';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';
import { api } from '../../convex/_generated/api';

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  route: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function kindLabel(kind: string) {
  switch (kind) {
    case 'diagnosis':
      return 'Diagnos';
    case 'pm':
      return 'PM';
    case 'nursing':
      return 'Omvårdnad';
    case 'medication':
      return 'Läkemedel';
    case 'card':
      return 'Snabbkort';
    default:
      return 'Fakta';
  }
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchResult[]>([]);
  const convexFacts = useQuery(api.facts.listPublished, {
    kind: 'all',
    limit: 100
  });

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const modules = await db.getAllAsync(
        `SELECT id, slug, title, category, summary
         FROM modules
         ORDER BY title ASC`
      ) as {
        id: string;
        slug: string;
        title: string;
        category: string;
        summary: string;
      }[];

      const pmModules = await db.getAllAsync(
        `SELECT id, title, category, summary
         FROM pm_modules
         ORDER BY title ASC`
      ) as {
        id: string;
        title: string;
        category: string;
        summary: string;
      }[];

      const nursingModules = await db.getAllAsync(
        `SELECT id, title, category, summary
         FROM nursing_modules
         ORDER BY title ASC`
      ) as {
        id: string;
        title: string;
        category: string;
        summary: string;
      }[];

      const medications = await db.getAllAsync(
        `SELECT id, name, group_name, indication, dosage
         FROM medications
         ORDER BY name ASC`
      ) as {
        id: number;
        name: string;
        group_name: string;
        indication: string;
        dosage: string;
      }[];

      setItems([
        ...modules.map((item) => ({
          id: `module-${item.id}`,
          title: item.title,
          subtitle: `Diagnos · ${item.category || 'PM'}`,
          body: item.summary || '',
          route: `/module/${item.slug}`
        })),
        ...pmModules.map((item) => ({
          id: `pm-${item.id}`,
          title: item.title,
          subtitle: `PM · ${item.category || 'Rutin'}`,
          body: item.summary || '',
          route: `/pm/${item.id}`
        })),
        ...nursingModules.map((item) => ({
          id: `nursing-${item.id}`,
          title: item.title,
          subtitle: `Omvårdnad · ${item.category || 'Rutin'}`,
          body: item.summary || '',
          route: `/nursing/${item.id}`
        })),
        ...medications.map((item) => ({
          id: `drug-${item.id}`,
          title: item.name,
          subtitle: `Läkemedel · ${item.group_name || 'Övrigt'}`,
          body: [item.indication, item.dosage].filter(Boolean).join(' · '),
          route: `/lakemedel/${item.id}`
        }))
      ]);
    }

    load().catch((error) => {
      console.log('SEARCH LOAD ERROR', error);
    });
  }, []);

  const mergedItems = useMemo(() => {
    const remoteItems = (convexFacts ?? []).map((fact) => ({
      id: `convex-${fact._id}`,
      title: fact.title,
      subtitle: `${kindLabel(fact.kind)} · ${fact.category || 'Convex'}`,
      body: fact.summary || fact.body,
      route: '/fakta'
    }));

    return [...remoteItems, ...items];
  }, [convexFacts, items]);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return mergedItems.slice(0, 20);

    return mergedItems
      .filter((item) => {
        const haystack = normalize(
          `${item.title} ${item.subtitle} ${item.body}`
        );
        return haystack.includes(needle);
      })
      .slice(0, 40);
  }, [mergedItems, query]);

  return (
    <Screen>
      <Text style={styles.title}>Sök</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Sök diagnos, PM eller läkemedel"
        placeholderTextColor={Colors.textSecondary}
        autoCapitalize="none"
      />

      <Text style={styles.subtitle}>
        {query ? `${results.length} träffar` : 'Visar vanliga ingångar'}
      </Text>

      {results.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => router.push(item.route as any)}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          {!!item.body && (
            <Text style={styles.cardBody} numberOfLines={3}>
              {item.body}
            </Text>
          )}
        </Pressable>
      ))}

      {query && results.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Inga träffar</Text>
          <Text style={styles.emptyText}>Prova ett annat sökord.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 14
  },

  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 17,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 13
  },

  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 14
  },

  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16
  },

  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },

  cardSubtitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7
  },

  cardBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 40
  },

  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4
  },

  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14
  }
});

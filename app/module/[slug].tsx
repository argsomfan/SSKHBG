import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getModuleBySlug } from '../../src/db/queries';
import { BackButton } from '../../src/components/BackButton';
import { Colors } from '../../src/theme';

export default function ModuleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [moduleData, setModuleData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const data = await getModuleBySlug(String(slug));
      setModuleData(data);
    }
    load();
  }, [slug]);

  if (!moduleData) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Laddar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton fallbackPath="/diagnoser" />

      <Text style={styles.title}>{moduleData.title}</Text>
      <Text style={styles.summary}>{moduleData.summary}</Text>

      {moduleData.sections.map((section: any, index: number) => (
        <View key={index} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>

          {section.items.map((item: string, i: number) => (
            <Text key={i} style={styles.cardText}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  center: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    flex: 1,
    justifyContent: 'center'
  },
  loading: { color: Colors.textSecondary, fontSize: 16 },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8
  },
  summary: { fontSize: 16, color: Colors.textSecondary, marginBottom: 18 },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: 6
  }
});

import { Text, View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getModuleBySlug } from '../../src/db/queries';
import { BackButton } from '../../src/components/BackButton';

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
        <Text>Laddar...</Text>
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
  container: { flex: 1, backgroundColor: '#f3f3f3' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 8 },
  summary: { fontSize: 16, color: '#555', marginBottom: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#222',
    marginBottom: 6
  }
});

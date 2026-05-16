import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { BackButton } from '../../src/components/BackButton';
import { Colors } from '../../src/theme';
import { getDb } from '../../src/db/database';

type Medication = {
  id: number;
  name: string;
  group_name: string;
  indication: string;
  pharmacodynamics: string;
  dosage: string;
  dilution: string;
  administration: string;
  infusion_time: string;
  administration_time: string;
  usage_time: string;
  side_effects: string;
  notes: string;
  monitoring_level: string;
  high_risk: string;
  source: string;
};

function InfoSection({ title, value }: { title: string; value?: string }) {
  if (!value || !value.trim()) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{value}</Text>
    </View>
  );
}

export default function LakemedelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [drug, setDrug] = useState<Medication | null>(null);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const row = await db.getFirstAsync<Medication>(
        `SELECT *
         FROM medications
         WHERE id = ?`,
        [id]
      );

      setDrug(row ?? null);
    }

    if (id) load();
  }, [id]);

  if (!drug) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title}>Läkemedel saknas</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BackButton fallbackPath="/lakemedel" />

        <Text style={styles.title}>{drug.name}</Text>
        <Text style={styles.subtitle}>{drug.group_name}</Text>

        {drug.high_risk ? (
          <Text style={styles.riskBadge}>Riskläkemedel</Text>
        ) : null}

        <InfoSection title="Indikation" value={drug.indication} />
        <InfoSection title="Farmakodynamik" value={drug.pharmacodynamics} />
        <InfoSection title="Dosering" value={drug.dosage} />
        <InfoSection title="Spädning" value={drug.dilution} />
        <InfoSection title="Administrering" value={drug.administration} />
        <InfoSection title="Infusionstid" value={drug.infusion_time} />
        <InfoSection title="Administrationstid" value={drug.administration_time} />
        <InfoSection title="Användningstid" value={drug.usage_time} />
        <InfoSection title="Biverkningar" value={drug.side_effects} />
        <InfoSection title="Övervakningsnivå" value={drug.monitoring_level} />
        <InfoSection title="Kommentarer" value={drug.notes} />
        <InfoSection title="Källa" value={drug.source} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background
  },

  container: {
    flex: 1,
    backgroundColor: Colors.background
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4
  },

  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16
  },

  riskBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffe5e5',
    color: Colors.primary,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 18
  },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8
  },

  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary
  }
});

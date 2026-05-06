import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../src/theme';

const calculators = [
  {
    title: 'Dos – Styrka – Mängd',
    subtitle: 'Räkna ut dos, styrka eller mängd',
    route: '/calculators/dos-styrka-mangd'
  },
  {
    title: 'Spädning',
    subtitle: 'C1 × V1 = C2 × V2',
    route: '/calculators/spadning'
  },
  {
    title: 'Syrgasflaska',
    subtitle: 'Flaskvolym × tryck / flöde',
    route: '/calculators/syrgas'
  },
  {
    title: 'Insulin',
    subtitle: 'TDD, basinsulin och måltidsinsulin',
    route: '/calculators/insulin'
  }
];

export default function Kalkylatorer() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Kalkylatorer</Text>
        <Text style={styles.subtitle}>Välj beräkning</Text>

        {calculators.map((item) => (
          <Pressable
            key={item.title}
            style={styles.card}
            onPress={() => router.push(item.route as any)}
          >
            <View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 44 },
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
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    maxWidth: 260
  },
  arrow: {
    fontSize: 34,
    color: Colors.textSecondary
  }
});
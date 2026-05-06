import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

const items = [
  {
    title: 'Diagnoser',
    subtitle: 'Medicinska tillstånd, symtom, diagnostik och principer',
    route: '/diagnoser'
  },
  {
    title: 'PM',
    subtitle: 'Handläggning, behandling, övervakning och eskalering',
    route: '/pm'
  },
  {
    title: 'Omvårdnad',
    subtitle: 'Omvårdnadsåtgärder kopplade till PM',
    route: '/omvardnad'
  },
  {
    title: 'Snabbkort',
    subtitle: 'Korta kliniska kort för snabb repetition',
    route: '/cards'
  },
  {
    title: 'Kalkylatorer',
    subtitle: 'Beräkningar för läkemedel, infusion och vätska',
    route: '/kalkylatorer'
  }
];

export default function BibliotekScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Bibliotek</Text>
      <Text style={styles.subtitle}>SSKHBG kliniskt innehåll</Text>

      {items.map((item) => (
        <Pressable
          key={item.title}
          style={styles.card}
          onPress={() => router.push(item.route)}
        >
          <View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f3f3'
  },

  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 40
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 6
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },

  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    maxWidth: 260
  },

  arrow: {
    fontSize: 32,
    color: '#bbb'
  }
});
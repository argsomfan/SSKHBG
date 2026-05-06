import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SSKHBG</Text>
      <Text style={styles.subtitle}>
        Appen startar korrekt
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18,
    color: '#666'
  }
});
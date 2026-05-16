import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { BackButton } from '../../src/components/BackButton';
import { Colors } from '../../src/theme';

function parseNumber(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function format(value: number, decimals = 1) {
  return value.toFixed(decimals).replace('.', ',');
}

export default function InsulinCalculatorScreen() {
  const [units, setUnits] = useState('');
  const [strength, setStrength] = useState('100');

  const result = useMemo(() => {
    const doseE = parseNumber(units);
    const strengthEMl = parseNumber(strength);

    if (doseE === null || strengthEMl === null || strengthEMl <= 0) {
      return {
        ml: null,
        text: 'Fyll i dos och styrka'
      };
    }

    const ml = doseE / strengthEMl;

    return {
      ml,
      text: `${format(ml, 2)} ml`
    };
  }, [units, strength]);

  return (
    <Screen>
      <BackButton fallbackPath="/kalkylatorer" />

      <Text style={styles.title}>Insulin</Text>

      <Text style={styles.subtitle}>
        Beräkna ml utifrån ordinerade enheter och styrka.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Grundregel</Text>
        <Text style={styles.infoText}>
          Mängd ml = ordinerade E / styrka E/ml
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ordinerad dos, E</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Ex. 50"
          placeholderTextColor={Colors.textSecondary}
          value={units}
          onChangeText={setUnits}
        />

        <Text style={styles.label}>Styrka, E/ml</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="Ex. 100"
          placeholderTextColor={Colors.textSecondary}
          value={strength}
          onChangeText={setStrength}
        />
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>Mängd att ge</Text>
        <Text style={styles.resultValue}>{result.text}</Text>
      </View>

      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>Kontroll</Text>
        <Text style={styles.warningText}>
          Kontrollera alltid insulinordination, blodsocker, insulinsort,
          styrka, administreringssätt och lokal rutin innan administrering.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 20
  },

  infoCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: 1
  },

  infoText: {
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border
  },

  label: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10
  },

  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    color: Colors.textPrimary
  },

  resultCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: 18
  },

  resultLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: 1
  },

  resultValue: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.textPrimary
  },

  warningCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warning
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.warning,
    marginBottom: 8
  },

  warningText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary
  }
});

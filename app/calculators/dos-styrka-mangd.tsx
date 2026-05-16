import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { BackButton } from '../../src/components/BackButton';
import { Colors } from '../../src/theme';

function parseNumber(value: string) {
  if (!value.trim()) return null;

  const cleaned = value
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: number) {
  return Number(value.toFixed(4))
    .toString()
    .replace('.', ',');
}

export default function DosStyrkaMangdScreen() {
  const [dose, setDose] = useState('');
  const [strength, setStrength] = useState('');
  const [amount, setAmount] = useState('');

  const [doseUnit, setDoseUnit] = useState('E');
  const [strengthUnit, setStrengthUnit] = useState('E/ml');
  const [amountUnit, setAmountUnit] = useState('ml');

  const result = useMemo(() => {
    const d = parseNumber(dose);
    const s = parseNumber(strength);
    const m = parseNumber(amount);

    const filled = [d, s, m].filter((v) => v !== null).length;

    if (filled < 2) {
      return {
        title: 'Fyll i två värden',
        value: '—',
        formula: 'Dos = Styrka × Mängd'
      };
    }

    if (filled > 2) {
      return {
        title: 'För många värden',
        value: '—',
        formula: 'Lämna ett fält tomt.'
      };
    }

    if (d === null && s !== null && m !== null) {
      return {
        title: 'Beräknad dos',
        value: `${formatNumber(s * m)} ${doseUnit}`,
        formula: 'Dos = Styrka × Mängd'
      };
    }

    if (s === null && d !== null && m !== null) {
      if (m <= 0) {
        return {
          title: 'Fel',
          value: '—',
          formula: 'Mängd måste vara större än 0.'
        };
      }

      return {
        title: 'Beräknad styrka',
        value: `${formatNumber(d / m)} ${strengthUnit}`,
        formula: 'Styrka = Dos / Mängd'
      };
    }

    if (m === null && d !== null && s !== null) {
      if (s <= 0) {
        return {
          title: 'Fel',
          value: '—',
          formula: 'Styrka måste vara större än 0.'
        };
      }

      return {
        title: 'Beräknad mängd',
        value: `${formatNumber(d / s)} ${amountUnit}`,
        formula: 'Mängd = Dos / Styrka'
      };
    }

    return {
      title: 'Kan inte beräkna',
      value: '—',
      formula: 'Kontrollera värden.'
    };
  }, [dose, strength, amount, doseUnit, strengthUnit, amountUnit]);

  return (
    <Screen>
      <BackButton fallbackPath="/kalkylatorer" />

      <Text style={styles.title}>Dos – Styrka – Mängd</Text>

      <Text style={styles.subtitle}>
        Fyll i två värden. Lämna det tredje tomt.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Dos</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={dose}
          onChangeText={setDose}
          placeholder="Ex. 12"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Dosenhet</Text>
        <TextInput
          style={styles.input}
          value={doseUnit}
          onChangeText={setDoseUnit}
          placeholder="Ex. mg, E, mmol"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Styrka</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={strength}
          onChangeText={setStrength}
          placeholder="Ex. 100"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Styrkeenhet</Text>
        <TextInput
          style={styles.input}
          value={strengthUnit}
          onChangeText={setStrengthUnit}
          placeholder="Ex. E/ml, mg/ml, mg/tablett"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Mängd</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="Lämna tom om den ska räknas ut"
          placeholderTextColor={Colors.textSecondary}
        />

        <Text style={styles.label}>Mängdenhet</Text>
        <TextInput
          style={styles.input}
          value={amountUnit}
          onChangeText={setAmountUnit}
          placeholder="Ex. ml, tabletter"
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>{result.title}</Text>
        <Text style={styles.resultValue}>{result.value}</Text>
        <Text style={styles.formula}>{result.formula}</Text>
      </View>

      <Text style={styles.warning}>
        Kontrollera alltid rimlighet mot ordination, läkemedlets styrka och lokal rutin.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 22
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
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8
  },

  formula: {
    fontSize: 14,
    color: Colors.textSecondary
  },

  warning: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center'
  }
});

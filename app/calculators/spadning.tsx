import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';

import {
  calculateDilution
} from '../../src/utils/calculations';

import {
  round
} from '../../src/utils/rounding';

function parseNumber(value: string) {
  const parsed = Number(
    value.replace(',', '.')
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export default function SpadningScreen() {
  const [dose, setDose] = useState('');
  const [target, setTarget] = useState('');

  const result = useMemo(() => {
    const doseMg = parseNumber(dose);
    const targetMgMl = parseNumber(target);

    if (
      doseMg === null ||
      targetMgMl === null ||
      targetMgMl <= 0
    ) {
      return null;
    }

    return round(
      calculateDilution(
        doseMg,
        targetMgMl
      ),
      2
    );
  }, [dose, target]);

  return (
    <Screen>
      <Text style={styles.title}>
        Spädning
      </Text>

      <Text style={styles.subtitle}>
        Beräkna total volym utifrån
        ordinerad dos och önskad styrka.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>
          Dos (mg)
        </Text>

        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={dose}
          onChangeText={setDose}
          placeholder="Ex. 50"
          placeholderTextColor={
            Colors.textSecondary
          }
        />

        <Text style={styles.label}>
          Önskad styrka (mg/ml)
        </Text>

        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={target}
          onChangeText={setTarget}
          placeholder="Ex. 2"
          placeholderTextColor={
            Colors.textSecondary
          }
        />
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>
          Total volym
        </Text>

        <Text style={styles.resultValue}>
          {result !== null
            ? `${result} ml`
            : '—'}
        </Text>

        <Text style={styles.formula}>
          Volym = Dos / önskad styrka
        </Text>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningTitle}>
          Kontroll
        </Text>

        <Text style={styles.warningText}>
          Kontrollera alltid lokal rutin,
          kompatibilitet, hållbarhet,
          infusionstid och ordination.
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
    fontSize: 34,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8
  },

  formula: {
    fontSize: 14,
    color: Colors.textSecondary
  },

  warning: {
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
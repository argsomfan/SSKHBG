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
  calculateC1V1C2V2,
  type DilutionField
} from '../../src/utils/calculations';

type FieldConfig = {
  key: DilutionField;
  label: string;
  unitLabel: string;
  placeholder: string;
};

const fields: FieldConfig[] = [
  {
    key: 'c1',
    label: 'C1 Ursprunglig styrka',
    unitLabel: 'samma styrkeenhet som C2',
    placeholder: 'Ex. 10'
  },
  {
    key: 'v1',
    label: 'V1 Volym koncentrat',
    unitLabel: 'ml',
    placeholder: 'Lämna tom om den ska räknas ut'
  },
  {
    key: 'c2',
    label: 'C2 Önskad styrka',
    unitLabel: 'samma styrkeenhet som C1',
    placeholder: 'Ex. 1'
  },
  {
    key: 'v2',
    label: 'V2 Slutvolym',
    unitLabel: 'ml',
    placeholder: 'Ex. 100'
  }
];

const resultLabels: Record<DilutionField, string> = {
  c1: 'Beräknad C1',
  v1: 'Beräknad V1',
  c2: 'Beräknad C2',
  v2: 'Beräknad V2'
};

function parseNumber(value: string) {
  if (!value.trim()) return null;

  const normalized = value
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function formatNumber(value: number) {
  return Number(value.toFixed(4))
    .toString()
    .replace('.', ',');
}

function resultUnit(field: DilutionField) {
  return field === 'c1' || field === 'c2'
    ? 'styrkeenhet'
    : 'ml';
}

export default function SpadningScreen() {
  const [values, setValues] = useState<Record<DilutionField, string>>({
    c1: '',
    v1: '',
    c2: '',
    v2: ''
  });

  const result = useMemo(() => calculateC1V1C2V2({
    c1: parseNumber(values.c1),
    v1: parseNumber(values.v1),
    c2: parseNumber(values.c2),
    v2: parseNumber(values.v2)
  }), [values]);

  function updateField(field: DilutionField, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <Screen>
      <Text style={styles.title}>
        Spädning
      </Text>

      <Text style={styles.subtitle}>
        Fyll i tre värden och lämna det fjärde tomt.
        Formeln är C1 × V1 = C2 × V2.
      </Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>
          Grundregel
        </Text>

        <Text style={styles.infoText}>
          C1 och C2 måste använda samma styrkeenhet.
          V1 och V2 anges i samma volymenhet.
        </Text>
      </View>

      <View style={styles.card}>
        {fields.map((field) => (
          <View key={field.key} style={styles.fieldBlock}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                {field.label}
              </Text>

              <Text style={styles.unitLabel}>
                {field.unitLabel}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={values[field.key]}
              onChangeText={(value) => updateField(field.key, value)}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
        ))}
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>
          {result.ok ? resultLabels[result.field] : result.title}
        </Text>

        <Text style={styles.resultValue}>
          {result.ok
            ? `${formatNumber(result.value)} ${resultUnit(result.field)}`
            : '-'}
        </Text>

        <Text style={styles.formula}>
          {result.ok ? result.formula : result.message}
        </Text>

        {result.ok && result.additiveVolume !== null ? (
          <View style={styles.extraResult}>
            <Text style={styles.extraLabel}>
              Tillsätt spädningsvätska
            </Text>

            <Text style={styles.extraValue}>
              {formatNumber(result.additiveVolume)} ml
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningTitle}>
          Kontroll
        </Text>

        <Text style={styles.warningText}>
          V2 är slutvolymen efter spädning. Kontrollera alltid
          ordination, lokal rutin, kompatibilitet, hållbarhet
          och rimlighet innan administrering.
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
    marginBottom: 16
  },

  infoCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 20,
    padding: 16,
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
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border
  },

  fieldBlock: {
    marginBottom: 14
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6
  },

  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary
  },

  unitLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right'
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
    color: Colors.textSecondary,
    lineHeight: 20
  },

  extraResult: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },

  extraLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4
  },

  extraValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary
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

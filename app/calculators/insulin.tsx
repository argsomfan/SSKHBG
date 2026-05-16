import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { Colors } from '../../src/theme';

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function format(value: number, decimals = 1) {
  return Number(value.toFixed(decimals)).toString().replace('.', ',');
}

export default function InsulinCalculatorScreen() {
  const [weight, setWeight] = useState('');
  const [tdd, setTdd] = useState('');
  const [basalPercent, setBasalPercent] = useState('50');

  const [carbs, setCarbs] = useState('');
  const [carbRatio, setCarbRatio] = useState('');

  const [glucose, setGlucose] = useState('');
  const [targetGlucose, setTargetGlucose] = useState('7');
  const [correctionFactor, setCorrectionFactor] = useState('');

  const [strength, setStrength] = useState('100');

  const result = useMemo(() => {
    const viktKg = parseNumber(weight);
    const dygnsdos = parseNumber(tdd);
    const basalProcent = parseNumber(basalPercent);

    const kolhydrater = parseNumber(carbs);
    const kolhydratKvot = parseNumber(carbRatio);

    const aktuelltGlukos = parseNumber(glucose);
    const malGlukos = parseNumber(targetGlucose);
    const korrFaktor = parseNumber(correctionFactor);

    const styrka = parseNumber(strength);

    const estimatedTddLow = viktKg ? viktKg * 0.3 : null;
    const estimatedTddHigh = viktKg ? viktKg * 0.5 : null;

    const basalDose =
      dygnsdos !== null && basalProcent !== null
        ? dygnsdos * (basalProcent / 100)
        : null;

    const basalX1 = basalDose;
    const basalX2 = basalDose !== null ? basalDose / 2 : null;

    const rapidDaily =
      dygnsdos !== null && basalDose !== null ? dygnsdos - basalDose : null;

    const estimatedCarbRatio =
      dygnsdos !== null && dygnsdos > 0 ? 500 / dygnsdos : null;

    const estimatedCorrectionFactor =
      dygnsdos !== null && dygnsdos > 0 ? 100 / dygnsdos : null;

    const mealDose =
      kolhydrater !== null && kolhydratKvot !== null && kolhydratKvot > 0
        ? kolhydrater / kolhydratKvot
        : null;

    const correctionDose =
      aktuelltGlukos !== null &&
      malGlukos !== null &&
      korrFaktor !== null &&
      korrFaktor > 0 &&
      aktuelltGlukos > malGlukos
        ? (aktuelltGlukos - malGlukos) / korrFaktor
        : 0;

    const totalRapid =
      mealDose !== null
        ? mealDose + correctionDose
        : correctionDose > 0
          ? correctionDose
          : null;

    const rapidVolumeMl =
      totalRapid !== null && styrka !== null && styrka > 0
        ? totalRapid / styrka
        : null;

    const basalVolumeMl =
      basalDose !== null && styrka !== null && styrka > 0
        ? basalDose / styrka
        : null;

    return {
      estimatedTddLow,
      estimatedTddHigh,
      basalDose,
      basalX1,
      basalX2,
      rapidDaily,
      estimatedCarbRatio,
      estimatedCorrectionFactor,
      mealDose,
      correctionDose,
      totalRapid,
      rapidVolumeMl,
      basalVolumeMl
    };
  }, [
    weight,
    tdd,
    basalPercent,
    carbs,
    carbRatio,
    glucose,
    targetGlucose,
    correctionFactor,
    strength
  ]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Insulin PRO</Text>

        <Text style={styles.subtitle}>
          Beräkna dygnsdos, långtidsinsulin, måltidsinsulin och korrektionsdos.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dygnsdos och långtidsinsulin</Text>

          <Text style={styles.label}>Vikt kg</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
            placeholder="Ex. 80"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Total dygnsdos insulin, E/dygn</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={tdd}
            onChangeText={setTdd}
            placeholder="Ex. 40"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Andel långtidsinsulin, %</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={basalPercent}
            onChangeText={setBasalPercent}
            placeholder="Ex. 40–50"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Måltidsinsulin</Text>

          <Text style={styles.label}>Kolhydrater, gram</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="Ex. 60"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Kolhydratkvot, gram per 1 E</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={carbRatio}
            onChangeText={setCarbRatio}
            placeholder="Ex. 10"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Korrektionsdos</Text>

          <Text style={styles.label}>Aktuellt P-glukos mmol/L</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={glucose}
            onChangeText={setGlucose}
            placeholder="Ex. 15"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Mål-P-glukos mmol/L</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={targetGlucose}
            onChangeText={setTargetGlucose}
            placeholder="Ex. 7"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Korrektionsfaktor mmol/L per 1 E</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={correctionFactor}
            onChangeText={setCorrectionFactor}
            placeholder="Ex. 3"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.label}>Insulinstyrka E/ml</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={strength}
            onChangeText={setStrength}
            placeholder="Ex. 100"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Resultat</Text>

          <Text style={styles.resultText}>
            Uppskattad TDD från vikt:{' '}
            {result.estimatedTddLow !== null && result.estimatedTddHigh !== null
              ? `${format(result.estimatedTddLow)}–${format(result.estimatedTddHigh)} E/dygn`
              : '—'}
          </Text>

          <Text style={styles.totalText}>
            Långtidsinsulin:{' '}
            {result.basalDose !== null ? `${format(result.basalDose)} E/dygn` : '—'}
          </Text>

          <Text style={styles.resultText}>
            Om x1: {result.basalX1 !== null ? `${format(result.basalX1)} E x1` : '—'}
          </Text>

          <Text style={styles.resultText}>
            Om x2:{' '}
            {result.basalX2 !== null
              ? `${format(result.basalX2)} E morgon + ${format(result.basalX2)} E kväll`
              : '—'}
          </Text>

          <Text style={styles.resultText}>
            Snabbinsulin kvar per dygn:{' '}
            {result.rapidDaily !== null ? `${format(result.rapidDaily)} E/dygn` : '—'}
          </Text>

          <Text style={styles.separator}>────────────</Text>

          <Text style={styles.resultText}>
            Måltidsdos:{' '}
            {result.mealDose !== null ? `${format(result.mealDose)} E` : '—'}
          </Text>

          <Text style={styles.resultText}>
            Korrektionsdos:{' '}
            {result.correctionDose > 0 ? `${format(result.correctionDose)} E` : '0 E'}
          </Text>

          <Text style={styles.totalText}>
            Total snabbinsulin:{' '}
            {result.totalRapid !== null ? `${format(result.totalRapid)} E` : '—'}
          </Text>

          <Text style={styles.resultText}>
            Volym snabbinsulin:{' '}
            {result.rapidVolumeMl !== null ? `${format(result.rapidVolumeMl, 2)} ml` : '—'}
          </Text>

          <Text style={styles.resultText}>
            Volym långtidsinsulin/dygn:{' '}
            {result.basalVolumeMl !== null ? `${format(result.basalVolumeMl, 2)} ml` : '—'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Formler</Text>
          <Text style={styles.infoText}>Långtidsinsulin = TDD × basalprocent</Text>
          <Text style={styles.infoText}>Måltidsdos = kolhydrater / kolhydratkvot</Text>
          <Text style={styles.infoText}>
            Korrektionsdos = (aktuellt P-glukos − mål) / korrektionsfaktor
          </Text>
          <Text style={styles.infoText}>Volym ml = E / styrka E/ml</Text>
        </View>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Varning</Text>
          <Text style={styles.warningText}>
            Detta är stöd för beräkning, inte ordination. Kontrollera alltid ordination,
            insulinsort, måltid, P-glukos, ketoner vid behov, lokal rutin och hypoglykemirisk.
          </Text>
        </View>
      </ScrollView>
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 12
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
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 1
  },
  resultText: {
    fontSize: 16,
    lineHeight: 28,
    color: Colors.textPrimary
  },
  totalText: {
    fontSize: 21,
    lineHeight: 34,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 8
  },
  separator: {
    color: Colors.textSecondary,
    marginVertical: 8
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 18
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    lineHeight: 21,
    color: Colors.textSecondary
  },
  warningCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warning,
    marginBottom: 30
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
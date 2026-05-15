export type DilutionField = 'c1' | 'v1' | 'c2' | 'v2';

export type DilutionValues = Record<DilutionField, number | null>;

export type DilutionResult =
  | {
      ok: true;
      field: DilutionField;
      value: number;
      formula: string;
      additiveVolume: number | null;
    }
  | {
      ok: false;
      title: string;
      message: string;
    };

function invalidResult(title: string, message: string): DilutionResult {
  return {
    ok: false,
    title,
    message
  };
}

function validResult(
  field: DilutionField,
  value: number,
  formula: string,
  values: DilutionValues
): DilutionResult {
  if (!Number.isFinite(value) || value <= 0) {
    return invalidResult(
      'Kan inte beräkna',
      'Kontrollera att värdena är rimliga och större än 0.'
    );
  }

  const v1 = field === 'v1' ? value : values.v1;
  const v2 = field === 'v2' ? value : values.v2;

  return {
    ok: true,
    field,
    value,
    formula,
    additiveVolume:
      v1 !== null && v2 !== null && v2 >= v1
        ? v2 - v1
        : null
  };
}

export function calculateC1V1C2V2(values: DilutionValues): DilutionResult {
  const entries = Object.entries(values) as Array<[DilutionField, number | null]>;
  const filled = entries.filter(([, value]) => value !== null).length;

  if (filled < 3) {
    return invalidResult(
      'Fyll i tre värden',
      'Lämna det värde som ska räknas ut tomt.'
    );
  }

  if (filled > 3) {
    return invalidResult(
      'För många värden',
      'Lämna exakt ett fält tomt.'
    );
  }

  if (entries.some(([, value]) => value !== null && value <= 0)) {
    return invalidResult(
      'Fel värde',
      'Alla ifyllda värden måste vara större än 0.'
    );
  }

  const { c1, v1, c2, v2 } = values;

  if (c1 === null && v1 !== null && c2 !== null && v2 !== null) {
    return validResult(
      'c1',
      (c2 * v2) / v1,
      'C1 = (C2 × V2) / V1',
      values
    );
  }

  if (v1 === null && c1 !== null && c2 !== null && v2 !== null) {
    return validResult(
      'v1',
      (c2 * v2) / c1,
      'V1 = (C2 × V2) / C1',
      values
    );
  }

  if (c2 === null && c1 !== null && v1 !== null && v2 !== null) {
    return validResult(
      'c2',
      (c1 * v1) / v2,
      'C2 = (C1 × V1) / V2',
      values
    );
  }

  if (v2 === null && c1 !== null && v1 !== null && c2 !== null) {
    return validResult(
      'v2',
      (c1 * v1) / c2,
      'V2 = (C1 × V1) / C2',
      values
    );
  }

  return invalidResult(
    'Kan inte beräkna',
    'Kontrollera värdena och lämna ett fält tomt.'
  );
}

export function calculateDilution(dose: number, targetStrength: number) {
  if (targetStrength <= 0) return 0;
  return dose / targetStrength;
}

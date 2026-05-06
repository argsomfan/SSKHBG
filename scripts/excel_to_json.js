const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = 'content/drugs';
const OUTPUT_FILE = 'content/drugs/medications.json';

function clean(value) {
  if (!value) return '';
  return String(value).trim();
}

function parseSheet(sheet) {
  const json = XLSX.utils.sheet_to_json(sheet);

  return json.map((row) => ({
    name: clean(row['Läkemedel']),
    group_name: clean(row['Läkemedelsgrupp']),
    indication: clean(row['Indikation']),
    pharmacodynamics: clean(row['Farmakodynamik']),
    dosage: clean(row['Dosering']),
    dilution: clean(row['Spädning']),
    administration: clean(row['Administreringssätt']),
    infusion_time: clean(row['Infusionstid']),
    administration_time: clean(row['Administreringstid']),
    usage_time: clean(row['Användningstid']),
    side_effects: clean(row['Biverkningar']),
    notes: clean(row['Kliniska kommentarer']),
    monitoring_level: clean(row['Övervakningsnivå']),
    high_risk: clean(row['Högrisk']),
    source: clean(row['Källa'])
  })).filter(med => med.name);
}

function main() {
  const files = [
  'Lakemedel_AVA_IMA_master_med_innehall_v3.xlsx'
];

  let allMedications = [];

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);

    console.log(`📄 Läser fil: ${file}`);

    const workbook = XLSX.readFile(filePath);

    for (const sheetName of workbook.SheetNames) {
      console.log(`  → Blad: ${sheetName}`);

      const sheet = workbook.Sheets[sheetName];
      const meds = parseSheet(sheet);

      allMedications = allMedications.concat(meds);
    }
  }

  console.log(`\nTotalt läkemedel: ${allMedications.length}`);
  // const unique = [];
// const seen = new Set();
//
// for (const med of allMedications) {
//   const key = med.name.toLowerCase().trim();
//
//   if (!seen.has(key)) {
//     seen.add(key);
//     unique.push(med);
//   }
// }
//
// console.log(`Efter borttagning av dubbletter: ${unique.length}`);

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(allMedications, null, 2)
  );

  console.log(`\nKLAR: ${OUTPUT_FILE}`);
}

main();
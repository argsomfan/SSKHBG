const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

const sources = [
  { key: 'modules', dir: 'content/modules' },
  { key: 'pm', dir: 'content/pm' },
  { key: 'nursing', dir: 'content/nursing' },
  { key: 'drugs_word', dir: 'content/drugs' },
  { key: 'dilutions', dir: 'content/dilutions_json' }
];

const outputDir = path.join(ROOT, 'src/data/generated');
const outputFile = path.join(outputDir, 'content_bundle.json');

function readJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];

  return fs.readdirSync(dirPath)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const fullPath = path.join(dirPath, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(raw);
    });
}

function main() {
  const bundle = {};

  for (const source of sources) {
    const dirPath = path.join(ROOT, source.dir);
    bundle[source.key] = readJsonFiles(dirPath);
    console.log(`${source.key}: ${bundle[source.key].length} filer`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(bundle, null, 2), 'utf8');

  console.log(`KLAR: ${outputFile}`);
}

main();
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

const ROOT = process.cwd();
const DEFAULT_INPUT = path.join(ROOT, "content/generated/convex_facts.json");
const BATCH_SIZE = 40;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    input: args.includes("--input")
      ? args[args.indexOf("--input") + 1]
      : DEFAULT_INPUT,
    dryRun: args.includes("--dry-run"),
  };
}

function chunks(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function summarize(records) {
  const byKind = new Map();
  for (const record of records) {
    byKind.set(record.kind, (byKind.get(record.kind) ?? 0) + 1);
  }

  return Array.from(byKind.entries())
    .sort(([a], [b]) => a.localeCompare(b, "sv"))
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(", ");
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env.local"));

  const { input, dryRun } = parseArgs();
  const inputPath = path.resolve(ROOT, input);
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Importfil saknas: ${inputPath}`);
  }

  const records = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(records)) {
    throw new Error("Importfilen måste vara en JSON-array.");
  }

  console.log(`Faktaposter: ${records.length}`);
  console.log(`Fördelning: ${summarize(records)}`);

  if (dryRun) {
    console.log("Dry run: ingen import skickades till Convex.");
    return;
  }

  if (!convexUrl) {
    throw new Error("EXPO_PUBLIC_CONVEX_URL saknas i miljön eller .env.local.");
  }

  const client = new ConvexHttpClient(convexUrl);
  const bulkUpsert = makeFunctionReference("facts:bulkUpsert");
  let inserted = 0;
  let updated = 0;
  let total = 0;

  for (const batch of chunks(records, BATCH_SIZE)) {
    const result = await client.mutation(bulkUpsert, { facts: batch });
    inserted += result.inserted;
    updated += result.updated;
    total += result.total;
    console.log(
      `Batch ${total}/${records.length}: +${result.inserted}, uppdaterade ${result.updated}`,
    );
  }

  console.log(`KLAR: ${total} faktaposter. Nya: ${inserted}. Uppdaterade: ${updated}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

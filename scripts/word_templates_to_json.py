from pathlib import Path
import json
import re

from docx import Document

INPUT_DIR = Path("content/word")
OUTPUT_MODULES_DIR = Path("content/modules")
OUTPUT_DRUGS_DIR = Path("content/drugs")
OUTPUT_NURSING_DIR = Path("content/nursing")
OUTPUT_DILUTIONS_DIR = Path("content/dilutions_json")
OUTPUT_PM_DIR = Path("content/pm")


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = text.replace("å", "a").replace("ä", "a").replace("ö", "o")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text


def norm(text: str) -> str:
    return text.strip().rstrip(":").lower()


def extract_lines(docx_path: Path):
    doc = Document(docx_path)
    lines = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            lines.append(text)
    return lines


def detect_template(lines: list[str], filename: str = "") -> str:
    joined = " | ".join(lines).lower()
    filename = filename.lower()

    if filename.startswith("pm_"):
        return "pm"

    if filename.startswith("diagnos_"):
        return "diagnosis"

    if "pm / diagnosmall" in joined:
        return "diagnosis"
    if "omvårdnadsmall" in joined or "omvardnadsmall" in joined:
        return "nursing"
    if "läkemedelsmall" in joined or "lakemedelsmall" in joined:
        return "drug"
    if "spädningsmall" in joined or "spadningsmall" in joined:
        return "dilution"

    if "pm_diagnos" in filename or "diagnos" in filename:
        return "diagnosis"
    if "omvardnad" in filename or "omvårdnad" in filename:
        return "nursing"
    if "lakemedel" in filename or "läkemedel" in filename:
        return "drug"
    if "spadning" in filename or "spädning" in filename:
        return "dilution"

    return "unknown"

def parse_sections(lines: list[str], heading_map: dict[str, str]):
    title = ""
    category = "Okänd"
    summary = ""
    data = {}

    current_key = None

    for idx, line in enumerate(lines):
        clean = line.strip()

        if idx == 0:
            # hoppa över mallrubrik om första raden är mallnamn
            if "mall" in clean.lower():
                continue

        if not title and "mall" not in clean.lower():
            title = clean
            continue

        lower = clean.lower()

        if lower.startswith("kategori:"):
            category = clean.split(":", 1)[1].strip() or "Okänd"
            continue

        if lower.startswith("sammanfattning:"):
            summary = clean.split(":", 1)[1].strip()
            continue

        normalized = norm(clean)

        if normalized in heading_map:
            current_key = heading_map[normalized]
            data[current_key] = []
            continue

        if current_key is None:
            if not summary:
                summary = clean
            continue

        bullet_text = clean.lstrip("•").strip()
        if bullet_text:
            data[current_key].append(bullet_text)

    if not title:
        raise ValueError(f"Ingen titel hittades i {lines}")

    if not summary:
        summary = f"{title} – importerat från Word."

    return title, category, summary, data


def build_diagnosis_json(lines: list[str]) -> tuple[dict, Path]:
    heading_map = {
    "definition": "definition",
    "orsaker och riskfaktorer": "orsaker_och_riskfaktorer",
    "symtom": "symtom",
    "status": "status",
    "diagnostik": "diagnostik",
    "behandling": "behandling",
    "omvårdnad": "omvardnad",
    "omvårdnadsåtgärder": "omvardnad",
    "omvardnad": "omvardnad",
    "omvardnadsatgarder": "omvardnad",
    "övervakning": "overvakning",
    "overvakning": "overvakning",
    "komplikationer": "komplikationer",
    "eskalering": "eskalering",
    "praktiska punkter": "praktiska_punkter",
    "referenser": "referenser",
}

    title, category, summary, data = parse_sections(lines, heading_map)

    result = {
        "module_id": f"{slugify(title)}_auto_001",
        "type": "clinical_module",
        "app": "SSKHBG",
        "language": "sv-SE",
        "title": title,
        "category": category,
        "summary": {
            "ingress": summary
        },
    }

    result.update(data)
    output_path = OUTPUT_MODULES_DIR / f"{slugify(title)}.json"
    return result, output_path

def build_pm_json(lines: list[str]) -> tuple[dict, Path]:
    heading_map = {
        "indikation": "indikation",
        "omedelbara åtgärder": "omedelbara_atgarder",
        "omedelbara atgarder": "omedelbara_atgarder",
        "handläggning steg-för-steg": "handlaggning",
        "handlaggning steg-for-steg": "handlaggning",
        "handläggning": "handlaggning",
        "handlaggning": "handlaggning",
        "läkemedel": "lakemedel",
        "lakemedel": "lakemedel",
        "omvårdnadsåtgärder": "omvardnad",
        "omvardnadsatgarder": "omvardnad",
        "övervakning": "overvakning",
        "overvakning": "overvakning",
        "eskalering": "eskalering",
        "praktiska punkter": "praktiska_punkter",
        "referenser": "referenser",
    }

    title, category, summary, data = parse_sections(lines, heading_map)

    result = {
        "module_id": f"{slugify(title)}_pm_auto_001",
        "type": "pm_module",
        "app": "SSKHBG",
        "language": "sv-SE",
        "title": title,
        "category": category,
        "summary": {
            "ingress": summary
        },
    }

    result.update(data)
    output_path = OUTPUT_PM_DIR / f"{slugify(title)}.json"
    return result, output_path

def build_nursing_json(lines: list[str]) -> tuple[dict, Path]:
    heading_map = {
        "syfte": "syfte",
        "indikationer": "indikationer",
        "förberedelser": "forberedelser",
        "genomförande": "genomforande",
        "observationer": "observationer",
        "risker och försiktighet": "risker_och_forsiktighet",
        "patientinformation": "patientinformation",
        "dokumentation": "dokumentation",
        "när eskalera": "nar_eskalera",
        "referenser": "referenser",
    }

    title, category, summary, data = parse_sections(lines, heading_map)

    result = {
        "module_id": f"{slugify(title)}_nursing_auto_001",
        "type": "nursing_module",
        "app": "SSKHBG",
        "language": "sv-SE",
        "title": title,
        "category": category,
        "summary": {
            "ingress": summary
        },
    }

    result.update(data)
    output_path = OUTPUT_NURSING_DIR / f"{slugify(title)}.json"
    return result, output_path


def build_drug_json(lines: list[str]) -> tuple[dict, Path]:
    heading_map = {
        "läkemedelsgrupp": "lakemedelsgrupp",
        "lakemedelsgrupp": "lakemedelsgrupp",
        "indikationer": "indikationer",
        "kontraindikationer": "kontraindikationer",
        "dosering": "dosering",
        "administration": "administration",
        "spädning": "spadning",
        "spadning": "spadning",
        "övervakning": "overvakning",
        "biverkningar": "biverkningar",
        "viktiga försiktigheter": "viktiga_forsiktigheter",
        "sjuksköterskepunkter": "sjukskoterskepunkter",
        "sjukskoterskepunkter": "sjukskoterskepunkter",
        "referenser": "referenser",
    }

    title, category, summary, data = parse_sections(lines, heading_map)

    result = {
        "drug_id": f"{slugify(title)}_drug_auto_001",
        "type": "drug_module",
        "app": "SSKHBG",
        "language": "sv-SE",
        "title": title,
        "category": category,
        "summary": summary,
    }

    result.update(data)
    output_path = OUTPUT_DRUGS_DIR / f"{slugify(title)}.json"
    return result, output_path


def build_dilution_json(lines: list[str]) -> tuple[dict, Path]:
    heading_map = {
        "läkemedel": "lakemedel",
        "lakemedel": "lakemedel",
        "originalstyrka": "originalstyrka",
        "spädning": "spadning",
        "spadning": "spadning",
        "slutkoncentration": "slutkoncentration",
        "administrationssätt": "administrationssatt",
        "administrationssatt": "administrationssatt",
        "infusionstakt": "infusionstakt",
        "hållbarhet": "hallbarhet",
        "hallbarhet": "hallbarhet",
        "kompatibilitet": "kompatibilitet",
        "övervakning": "overvakning",
        "risker": "risker",
        "referenser": "referenser",
    }

    title, category, summary, data = parse_sections(lines, heading_map)

    result = {
        "dilution_id": f"{slugify(title)}_dilution_auto_001",
        "type": "dilution_module",
        "app": "SSKHBG",
        "language": "sv-SE",
        "title": title,
        "category": category,
        "summary": summary,
    }

    result.update(data)
    output_path = OUTPUT_DILUTIONS_DIR / f"{slugify(title)}.json"
    return result, output_path


def main():
    OUTPUT_MODULES_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DRUGS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_NURSING_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DILUTIONS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PM_DIR.mkdir(parents=True, exist_ok=True)

    if not INPUT_DIR.exists():
      print(f"Skapa mappen först: {INPUT_DIR}")
      return

    docx_files = sorted(INPUT_DIR.glob("*.docx"))

    if not docx_files:
        print(f"Inga .docx-filer hittades i {INPUT_DIR}")
        return

    for docx_file in docx_files:
        lines = extract_lines(docx_file)
        template_type = detect_template(lines, docx_file.name)

        if template_type == "diagnosis":
            data, output_path = build_diagnosis_json(lines)
        elif template_type == "pm":
            data, output_path = build_pm_json(lines)
        elif template_type == "nursing":
            data, output_path = build_nursing_json(lines)
        elif template_type == "drug":
            data, output_path = build_drug_json(lines)
        elif template_type == "dilution":
            data, output_path = build_dilution_json(lines)
        else:
            print(f"Hoppar över {docx_file.name}: okänd malltyp")
            continue

        with output_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"KLAR: {docx_file.name} -> {output_path}")


if __name__ == "__main__":
    main()
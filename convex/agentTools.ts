import { Doc } from "./_generated/dataModel";

type AgentStatus = "klar" | "nästa" | "säkring";

export type ClientSource = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  body: string;
  route: string;
  score: number;
};

export type ClientStep = {
  title: string;
  detail: string;
  status: AgentStatus;
};

export type WebSearchPlan = {
  enabled: boolean;
  query: string;
  reason: string;
};

export type AgentToolLayer = {
  intent: string;
  confidenceLabel: string;
  sources: ClientSource[];
  plan: ClientStep[];
  tools: ClientStep[];
  nextActions: string[];
  guardrails: string[];
  toolContext: {
    selectedIntent: string;
    calculators: Array<{
      title: string;
      route: string;
      reason: string;
    }>;
    topSources: Array<{
      kind: string;
      title: string;
      subtitle: string;
    }>;
    webSearch: WebSearchPlan;
    safetyChecks: string[];
  };
};

const factKindLabels: Record<Doc<"facts">["kind"], string> = {
  diagnosis: "Diagnos",
  pm: "PM",
  nursing: "Omvårdnad",
  medication: "Läkemedel",
  card: "Snabbkort",
  other: "Fakta",
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesAny(query: string, words: string[]) {
  const value = normalize(query);
  return words.some((word) => value.includes(word));
}

function inferIntent(query: string) {
  if (!query.trim()) return "Agent redo";
  if (includesAny(query, ["sepsis", "chock", "laktat", "hypotension"])) {
    return "Akut handläggning";
  }
  if (includesAny(query, ["spadning", "spädning", "dos", "styrka", "mangd", "mängd", "insulin", "syrgas"])) {
    return "Beräkning och läkemedelsstöd";
  }
  if (includesAny(query, ["lakemedel", "läkemedel", "infusion", "administrering", "antibiotika"])) {
    return "Läkemedelsstöd";
  }
  if (includesAny(query, ["omvardnad", "omvårdnad", "kontroll", "overvakning", "övervakning", "pvk"])) {
    return "Omvårdnad och övervakning";
  }
  if (includesAny(query, ["pm", "rutin", "algoritm", "eskalering"])) {
    return "PM och lokal rutin";
  }

  return "Klinisk orientering";
}

function factSources(facts: Doc<"facts">[]): ClientSource[] {
  return facts.map((fact, index) => ({
    id: `convex:${fact._id}`,
    kind: factKindLabels[fact.kind],
    title: fact.title,
    subtitle: [fact.category, fact.source].filter(Boolean).join(" · "),
    body: [fact.summary, fact.body].filter(Boolean).join("\n").slice(0, 700),
    route: "/fakta",
    score: 120 - index,
  }));
}

function mergeSources(primary: ClientSource[], secondary: ClientSource[]) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((source) => {
      const key = `${source.kind}:${source.title}`.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function calculatorRoutes(query: string) {
  const routes: AgentToolLayer["toolContext"]["calculators"] = [];

  if (includesAny(query, ["spadning", "spädning", "koncentration", "infusion"])) {
    routes.push({
      title: "Spädningskalkylator",
      route: "/calculators/spadning",
      reason: "Frågan innehåller spädning, koncentration eller infusion.",
    });
  }

  if (includesAny(query, ["insulin", "ie", "blodsocker", "glukos"])) {
    routes.push({
      title: "Insulinkalkylator",
      route: "/calculators/insulin",
      reason: "Frågan innehåller insulin eller glukosrelaterade termer.",
    });
  }

  if (includesAny(query, ["dos", "styrka", "mangd", "mängd"])) {
    routes.push({
      title: "Dos-styrka-mängd",
      route: "/calculators/dos-styrka-mangd",
      reason: "Frågan innehåller dos, styrka eller mängd.",
    });
  }

  if (includesAny(query, ["syrgas", "oxygen", "flaska", "flode", "flöde"])) {
    routes.push({
      title: "Syrgaskalkylator",
      route: "/calculators/syrgas",
      reason: "Frågan innehåller syrgas, flöde eller flasktid.",
    });
  }

  return routes.slice(0, 3);
}

function webSearchPlan(query: string): WebSearchPlan {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      enabled: false,
      query: "",
      reason: "Väntar på en klinisk fråga innan webbsökning kan användas.",
    };
  }

  return {
    enabled: true,
    query: trimmedQuery,
    reason:
      "Webbsökning kan komplettera SSKHBG-källor med citerade, externa källor när aktuell information behövs.",
  };
}

function safetyChecks(query: string) {
  const checks = [
    "Visa källor och låt ansvarig kliniker bekräfta före åtgärd.",
    "Ge beslutsstöd och kontrollpunkter, inte ordination.",
  ];

  if (includesAny(query, ["sepsis", "chock", "hypotension", "laktat"])) {
    checks.push("Vid instabilitet: följ larmkedja, NEWS/ABCDE och lokal eskaleringsrutin.");
  }

  if (includesAny(query, ["kalium", "hyperkalemi", "ekg"])) {
    checks.push("Vid elektrolytrubbning: kontrollera EKG, provsvar, njurfunktion och monitorering.");
  }

  if (includesAny(query, ["insulin", "glukos", "hypoglykemi", "blodsocker"])) {
    checks.push("Vid insulin/glukos: kontrollera P-glukos, kalium och ordinerad behandlingsplan.");
  }

  if (includesAny(query, ["lakemedel", "läkemedel", "dos", "spadning", "spädning"])) {
    checks.push("Vid läkemedel: kontrollera dos, spädning, administrationsväg, allergi och kontraindikationer.");
  }

  return checks.slice(0, 5);
}

function sourceToolDetail(sources: ClientSource[], facts: Doc<"facts">[]) {
  const convexCount = facts.length;
  const localCount = sources.filter((source) => !source.id.startsWith("convex:")).length;

  if (convexCount > 0 && localCount > 0) {
    return `${convexCount} publicerade Convex-fakta och ${localCount} lokala källor jämfördes.`;
  }

  if (convexCount > 0) {
    return `${convexCount} publicerade Convex-fakta hittades.`;
  }

  return `${localCount} lokala källor användes.`;
}

export function runAgentToolLayer(args: {
  query: string;
  localSources: ClientSource[];
  facts: Doc<"facts">[];
}): AgentToolLayer {
  const intent = inferIntent(args.query);
  const remoteSources = factSources(args.facts);
  const sources = mergeSources(remoteSources, args.localSources);
  const calculators = calculatorRoutes(args.query);
  const checks = safetyChecks(args.query);
  const webSearch = webSearchPlan(args.query);
  const medicationHits = sources.filter((source) => source.kind === "Läkemedel");
  const medicationIntent = includesAny(args.query, ["lakemedel", "läkemedel", "dos", "spadning", "spädning", "antibiotika", "infusion"]);
  const topSources = sources.slice(0, 4).map((source) => ({
    kind: source.kind,
    title: source.title,
    subtitle: source.subtitle,
  }));

  const tools: ClientStep[] = [
    {
      title: "Intent Router",
      detail: `${intent} valt utifrån frågan.`,
      status: args.query.trim() ? "klar" : "nästa",
    },
    {
      title: "Knowledge Search",
      detail: sourceToolDetail(sources, args.facts),
      status: sources.length > 0 ? "klar" : "nästa",
    },
    {
      title: "Medication Tool",
      detail:
        medicationHits.length > 0
          ? `${medicationHits.length} läkemedelsträffar markerade för kontroll.`
          : medicationIntent
            ? "Läkemedelsfråga upptäckt, men ingen läkemedelskälla hittades i arbetsminnet."
            : "Inga läkemedelsträffar behövde prioriteras.",
      status:
        medicationHits.length > 0
          ? "klar"
          : medicationIntent
            ? "säkring"
            : "nästa",
    },
    {
      title: "Calculator Router",
      detail:
        calculators.length > 0
          ? calculators.map((calculator) => calculator.title).join(", ")
          : "Ingen kalkylator behövde öppnas för frågan.",
      status: calculators.length > 0 ? "klar" : "nästa",
    },
    {
      title: "Web Search",
      detail: webSearch.reason,
      status: webSearch.enabled ? "nästa" : "säkring",
    },
    {
      title: "Safety Gate",
      detail: `${checks.length} säkerhetskontroller kopplades till svaret.`,
      status: "säkring",
    },
  ];

  const plan: ClientStep[] = [
    {
      title: "Tolka fråga",
      detail: `Agenten klassade frågan som: ${intent}.`,
      status: args.query.trim() ? "klar" : "nästa",
    },
    {
      title: "Köra verktyg",
      detail: tools
        .filter((tool) => tool.status === "klar")
        .map((tool) => tool.title)
        .join(" · ") || "Väntar på en tydligare fråga.",
      status: tools.some((tool) => tool.status === "klar") ? "klar" : "nästa",
    },
    {
      title: "Sammanväga källor",
      detail:
        sources.length > 0
          ? `${sources.length} SSKHBG-källor finns i agentens arbetsminne.`
          : "Inga säkra källor hittades ännu.",
      status: sources.length > 0 ? "klar" : "nästa",
    },
    {
      title: "Människa i loopen",
      detail: "Svaret ska visa källor, osäkerhet och kontrollpunkter före klinisk åtgärd.",
      status: "säkring",
    },
  ];

  const nextActions = [
    sources[0] ? `Öppna och kontrollera ${sources[0].title}` : "Lägg till eller publicera relevant fakta",
    calculators[0] ? `Använd ${calculators[0].title} vid behov` : "Ställ följdfråga om patientdata saknas",
    webSearch.enabled ? "Granska eventuella webbkällor med datum, avsändare och lokal relevans" : "",
    "Bekräfta mot lokal rutin och ansvarig kliniker",
  ].filter(Boolean);

  return {
    intent,
    confidenceLabel:
      sources.length >= 4
        ? "Tool layer: starkt källstöd"
        : sources.length > 0
          ? "Tool layer: begränsat källstöd"
          : "Tool layer: saknar källstöd",
    sources,
    plan,
    tools,
    nextActions,
    guardrails: checks,
    toolContext: {
      selectedIntent: intent,
      calculators,
      topSources,
      webSearch,
      safetyChecks: checks,
    },
  };
}

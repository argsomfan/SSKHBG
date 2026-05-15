import { getDb } from '../db/database';

export type AgentSourceKind =
  | 'Diagnos'
  | 'PM'
  | 'Omvårdnad'
  | 'Läkemedel'
  | 'Snabbkort';

export type AgentSource = {
  id: string;
  kind: AgentSourceKind;
  title: string;
  subtitle: string;
  body: string;
  route: string;
  score: number;
};

export type AgentToolRun = {
  name: string;
  detail: string;
  status: 'klar' | 'nästa' | 'säkring';
};

export type AgentPlanStep = {
  title: string;
  detail: string;
  status: 'klar' | 'nästa' | 'säkring';
};

export type AgentResult = {
  query: string;
  intentTitle: string;
  responseTitle: string;
  responseSummary: string;
  reasoning?: string;
  confidenceLabel: string;
  generatedAt: string;
  plan: AgentPlanStep[];
  tools: AgentToolRun[];
  sources: AgentSource[];
  nextActions: string[];
  guardrails: string[];
  backend?: {
    mode: 'local' | 'ai' | 'fallback';
    configured: boolean;
    model?: string;
    message: string;
  };
};

type RawSource = Omit<AgentSource, 'score'>;

const DEFAULT_AGENT_QUERY = 'sepsis läkemedel omvårdnad övervakning';

function normalize(value: string) {
  return value
    .toLocaleLowerCase('sv-SE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9åäö]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);
}

function scoreSource(source: RawSource, query: string) {
  const normalizedQuery = normalize(query);
  const tokens = tokenize(query);
  const title = normalize(source.title);
  const subtitle = normalize(source.subtitle);
  const body = normalize(source.body);

  if (!normalizedQuery) return 1;

  let score = 0;

  if (title === normalizedQuery) score += 70;
  if (title.includes(normalizedQuery)) score += 42;
  if (subtitle.includes(normalizedQuery)) score += 18;
  if (body.includes(normalizedQuery)) score += 14;

  for (const token of tokens) {
    if (title.includes(token)) score += 16;
    if (subtitle.includes(token)) score += 8;
    if (body.includes(token)) score += 5;
  }

  if (source.kind === 'Läkemedel' && hasMedicationIntent(query)) score += 16;
  if (source.kind === 'PM' && hasProtocolIntent(query)) score += 10;
  if (source.kind === 'Omvårdnad' && hasNursingIntent(query)) score += 10;

  return score;
}

function hasMedicationIntent(query: string) {
  const value = normalize(query);
  return [
    'lakemedel',
    'dos',
    'dosering',
    'spadning',
    'infusion',
    'administrering',
    'insulin',
    'antibiotika'
  ].some((word) => value.includes(word));
}

function hasProtocolIntent(query: string) {
  const value = normalize(query);
  return ['pm', 'rutin', 'algoritm', 'handlaggning', 'eskalering'].some(
    (word) => value.includes(word)
  );
}

function hasNursingIntent(query: string) {
  const value = normalize(query);
  return ['omvardnad', 'kontroll', 'overvakning', 'pvk', 'observation'].some(
    (word) => value.includes(word)
  );
}

function inferIntent(query: string) {
  const value = normalize(query);

  if (!value) return 'Agent redo';
  if (hasMedicationIntent(query)) return 'Läkemedelsstöd';
  if (value.includes('sepsis') || value.includes('chock')) {
    return 'Akut handläggning';
  }
  if (value.includes('hypo') || value.includes('hyper')) {
    return 'Elektrolyt och glukos';
  }
  if (hasNursingIntent(query)) return 'Omvårdnad och övervakning';

  return 'Klinisk orientering';
}

function buildSummary(query: string, sources: AgentSource[]) {
  if (!query.trim()) {
    return 'Agenten är redo att tolka en fråga, välja verktyg och hämta källor ur SSKHBG.';
  }

  if (sources.length === 0) {
    return 'Jag hittade inga tydliga lokala träffar. Prova diagnos, PM, läkemedel eller en kortare klinisk fråga.';
  }

  const first = sources[0];
  const second = sources[1];
  const sourceText = second
    ? `${first.title} och ${second.title}`
    : first.title;

  return `Jag prioriterar ${sourceText} och visar källor, plan och nästa säkra steg utifrån appens lokala innehåll.`;
}

function buildPlan(query: string, sourceCount: number): AgentPlanStep[] {
  return [
    {
      title: 'Förstå uppdraget',
      detail: query.trim()
        ? 'Tolka frågan och välj om den gäller diagnos, PM, omvårdnad, läkemedel eller beräkning.'
        : 'Väntar på en konkret klinisk fråga eller ett patientscenario.',
      status: query.trim() ? 'klar' : 'nästa'
    },
    {
      title: 'Hämta lokala källor',
      detail:
        sourceCount > 0
          ? `${sourceCount} relevanta SSKHBG-källor hittades och rangordnades.`
          : 'Sök i diagnoser, PM, omvårdnad, läkemedel och snabbkort.',
      status: sourceCount > 0 ? 'klar' : 'nästa'
    },
    {
      title: 'Välja verktyg',
      detail: hasMedicationIntent(query)
        ? 'Läkemedelskort och spädnings-/dosstöd behöver kontrolleras.'
        : 'Agenten väljer källa, sökväg och eventuell beräkning efter frågan.',
      status: query.trim() ? 'klar' : 'nästa'
    },
    {
      title: 'Människa i loopen',
      detail:
        'Visa källor och beslutspunkter så ansvarig kliniker kan bekräfta före åtgärd.',
      status: 'säkring'
    }
  ];
}

function buildTools(query: string, counts: Record<AgentSourceKind, number>): AgentToolRun[] {
  return [
    {
      name: 'Orchestrator',
      detail: `${inferIntent(query)} vald som arbetsläge.`,
      status: query.trim() ? 'klar' : 'nästa'
    },
    {
      name: 'SSKHBG Search',
      detail: `${counts.Diagnos + counts.PM + counts.Omvårdnad + counts.Snabbkort} kliniska källor genomsökta.`,
      status: 'klar'
    },
    {
      name: 'Drug Tool',
      detail: `${counts.Läkemedel} läkemedelskort kontrollerade för möjliga träffar.`,
      status: hasMedicationIntent(query) ? 'klar' : 'nästa'
    },
    {
      name: 'Safety Gate',
      detail: 'Svaret låses till källor, kontrollfrågor och nästa steg.',
      status: 'säkring'
    }
  ];
}

async function loadSources() {
  const db = await getDb();

  const [modules, pmModules, nursingModules, medications, cards] =
    await Promise.all([
      db.getAllAsync<{
        id: string;
        slug: string;
        title: string;
        category: string;
        summary: string;
      }>(
        `SELECT id, slug, title, category, summary
         FROM modules
         ORDER BY title ASC`
      ),
      db.getAllAsync<{
        id: string;
        title: string;
        category: string;
        summary: string;
      }>(
        `SELECT id, title, category, summary
         FROM pm_modules
         ORDER BY title ASC`
      ),
      db.getAllAsync<{
        id: string;
        title: string;
        category: string;
        summary: string;
      }>(
        `SELECT id, title, category, summary
         FROM nursing_modules
         ORDER BY title ASC`
      ),
      db.getAllAsync<{
        id: number;
        name: string;
        group_name: string;
        indication: string;
        dosage: string;
        dilution: string;
        administration: string;
        high_risk: string;
      }>(
        `SELECT id, name, group_name, indication, dosage, dilution, administration, high_risk
         FROM medications
         ORDER BY name ASC`
      ),
      db.getAllAsync<{
        id: string;
        title: string;
        category: string;
      }>(
        `SELECT id, title, category
         FROM cards
         ORDER BY title ASC`
      )
    ]);

  const sources: RawSource[] = [
    ...modules.map((item) => ({
      id: item.id,
      kind: 'Diagnos' as const,
      title: item.title,
      subtitle: item.category || 'Diagnos',
      body: item.summary || '',
      route: `/module/${item.slug}`
    })),
    ...pmModules.map((item) => ({
      id: item.id,
      kind: 'PM' as const,
      title: item.title,
      subtitle: item.category || 'PM',
      body: item.summary || '',
      route: `/pm/${item.id}`
    })),
    ...nursingModules.map((item) => ({
      id: item.id,
      kind: 'Omvårdnad' as const,
      title: item.title,
      subtitle: item.category || 'Omvårdnad',
      body: item.summary || '',
      route: `/nursing/${item.id}`
    })),
    ...medications.map((item) => ({
      id: String(item.id),
      kind: 'Läkemedel' as const,
      title: item.name,
      subtitle: item.group_name || 'Läkemedel',
      body: [
        item.indication,
        item.dosage,
        item.dilution,
        item.administration,
        item.high_risk ? `Risk: ${item.high_risk}` : ''
      ]
        .filter(Boolean)
        .join(' · '),
      route: `/lakemedel/${item.id}`
    })),
    ...cards.map((item) => ({
      id: item.id,
      kind: 'Snabbkort' as const,
      title: item.title,
      subtitle: item.category || 'Snabbkort',
      body: '',
      route: '/cards'
    }))
  ];

  const counts = sources.reduce<Record<AgentSourceKind, number>>(
    (acc, source) => {
      acc[source.kind] += 1;
      return acc;
    },
    {
      Diagnos: 0,
      PM: 0,
      Omvårdnad: 0,
      Läkemedel: 0,
      Snabbkort: 0
    }
  );

  return { sources, counts };
}

export async function runSskhbgAgent(rawQuery: string): Promise<AgentResult> {
  const query = rawQuery.trim();
  const scoringQuery = query || DEFAULT_AGENT_QUERY;
  const { sources: rawSources, counts } = await loadSources();

  const sources = rawSources
    .map((source) => ({
      ...source,
      score: scoreSource(source, scoringQuery)
    }))
    .filter((source) => source.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'sv'))
    .slice(0, 8);

  const plan = buildPlan(query, sources.length);

  return {
    query,
    intentTitle: inferIntent(query),
    responseTitle: query.trim()
      ? 'Agentisk plan klar'
      : 'SSKHBG Agent är redo',
    responseSummary: buildSummary(query, sources),
    reasoning: 'Lokal agent: rangordnar SSKHBG-källor och bygger en säker handlingsplan utan server-LLM.',
    confidenceLabel:
      sources.length >= 3 ? 'Stark lokal träff' : 'Behöver mer kontext',
    generatedAt: new Date().toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    plan,
    tools: buildTools(query, counts),
    sources,
    nextActions: [
      sources[0] ? `Öppna ${sources[0].title}` : 'Skriv en mer specifik fråga',
      hasMedicationIntent(query)
        ? 'Kontrollera dos, spädning och riskmarkering'
        : 'Jämför mot PM och omvårdnadsstöd',
      'Bekräfta mot patientdata och lokal rutin'
    ],
    guardrails: [
      'Beslutsstöd, inte ordination.',
      'Kontrollera alltid patient, vitalparametrar, provsvar och lokalt PM.',
      'Vid akut försämring: följ larm- och eskaleringsrutin.'
    ],
    backend: {
      mode: 'local',
      configured: false,
      message: 'Kör lokal agent utan AI-backend.'
    }
  };
}

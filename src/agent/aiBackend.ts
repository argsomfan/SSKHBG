import {
  AgentPlanStep,
  AgentResult,
  AgentSource,
  AgentSourceKind,
  AgentToolRun,
  runSskhbgAgent
} from './sskhbgAgent';

type BackendToolRun = {
  name?: string;
  title?: string;
  detail: string;
  status: AgentToolRun['status'];
};

type BackendSource = {
  id?: string;
  kind?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  route?: string;
  score?: number;
};

type BackendAgentResponse = {
  responseTitle?: string;
  responseSummary?: string;
  reasoning?: string;
  confidenceLabel?: string;
  plan?: AgentPlanStep[];
  tools?: BackendToolRun[];
  sources?: BackendSource[];
  nextActions?: string[];
  guardrails?: string[];
  backend?: AgentResult['backend'];
};

const sourceKinds: AgentSourceKind[] = [
  'Diagnos',
  'PM',
  'Omvårdnad',
  'Läkemedel',
  'Snabbkort',
  'Fakta'
];

function getAgentEndpoint() {
  const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
  if (!siteUrl) return null;
  return `${siteUrl.replace(/\/$/, '')}/api/agent`;
}

function withBackendFallback(localResult: AgentResult, message: string): AgentResult {
  return {
    ...localResult,
    reasoning: message,
    tools: [
      ...localResult.tools,
      {
        name: 'Convex AI Backend',
        detail: message,
        status: 'säkring'
      }
    ],
    backend: {
      mode: 'fallback',
      configured: false,
      message
    }
  };
}

function normalizeBackendTools(tools: BackendToolRun[] | undefined) {
  return (tools ?? []).map((tool) => ({
    name: tool.name ?? tool.title ?? 'AI Tool',
    detail: tool.detail,
    status: tool.status
  }));
}

function normalizeBackendSources(sources: BackendSource[] | undefined): AgentSource[] {
  return (sources ?? [])
    .map((source, index) => {
      const kind = sourceKinds.includes(source.kind as AgentSourceKind)
        ? source.kind as AgentSourceKind
        : 'Fakta';

      return {
        id: source.id || `backend-${index}`,
        kind,
        title: source.title || 'Convex-fakta',
        subtitle: source.subtitle || 'Publicerad faktakälla',
        body: source.body || '',
        route: source.route || '/fakta',
        score:
          typeof source.score === 'number' && Number.isFinite(source.score)
            ? source.score
            : 0
      };
    })
    .filter((source) => Boolean(source.title));
}

export async function runSskhbgAiAgent(rawQuery: string): Promise<AgentResult> {
  const localResult = await runSskhbgAgent(rawQuery);
  const endpoint = getAgentEndpoint();

  if (!endpoint) {
    return withBackendFallback(
      localResult,
      'EXPO_PUBLIC_CONVEX_SITE_URL saknas, så appen kör lokal agent.'
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: localResult.query,
        sources: localResult.sources,
        localAgent: {
          responseTitle: localResult.responseTitle,
          responseSummary: localResult.responseSummary,
          confidenceLabel: localResult.confidenceLabel,
          plan: localResult.plan,
          tools: localResult.tools,
          nextActions: localResult.nextActions,
          guardrails: localResult.guardrails
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Convex svarade med ${response.status}.`);
    }

    const backendResult = await response.json() as BackendAgentResponse;
    const backendTools = normalizeBackendTools(backendResult.tools);
    const backendSources = normalizeBackendSources(backendResult.sources);

    return {
      ...localResult,
      responseTitle: backendResult.responseTitle || localResult.responseTitle,
      responseSummary:
        backendResult.responseSummary || localResult.responseSummary,
      reasoning: backendResult.reasoning || localResult.reasoning,
      confidenceLabel:
        backendResult.confidenceLabel || localResult.confidenceLabel,
      plan: backendResult.plan?.length ? backendResult.plan : localResult.plan,
      tools: backendTools.length ? backendTools : localResult.tools,
      sources: backendSources.length ? backendSources : localResult.sources,
      nextActions: backendResult.nextActions?.length
        ? backendResult.nextActions
        : localResult.nextActions,
      guardrails: backendResult.guardrails?.length
        ? backendResult.guardrails
        : localResult.guardrails,
      backend: backendResult.backend ?? {
        mode: 'ai',
        configured: true,
        message: 'AI-svar genererat på Convex backend.'
      }
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'AI-backenden kunde inte nås, lokal agent används.';

    return withBackendFallback(localResult, message);
  }
}

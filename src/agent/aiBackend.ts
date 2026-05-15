import { AgentPlanStep, AgentResult, AgentToolRun, runSskhbgAgent } from './sskhbgAgent';

type BackendToolRun = {
  name?: string;
  title?: string;
  detail: string;
  status: AgentToolRun['status'];
};

type BackendAgentResponse = {
  responseTitle?: string;
  responseSummary?: string;
  reasoning?: string;
  confidenceLabel?: string;
  plan?: AgentPlanStep[];
  tools?: BackendToolRun[];
  nextActions?: string[];
  guardrails?: string[];
  backend?: AgentResult['backend'];
};

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
